from flask import Blueprint, render_template, request, jsonify, send_file, abort
from models import db, Cotacao, ProdutoCotacao, Anexo, MAX_ANEXOS
from services.utils import exportar_para_excel
from datetime import datetime
import os
import pytz
from werkzeug.utils import secure_filename
import json
import traceback
import threading
from services.email_service import enviar_email, obter_email_por_status
from urllib.parse import unquote

cotacao_routes = Blueprint('cotacao_routes', __name__)

STATUS_OPTIONS = [
    'Análise Comercial', 
    'Análise Suprimentos', 
    'Liberado para Venda', 
    'Cotação Perdida'
]

TZ_SP = pytz.timezone('America/Sao_Paulo')

# Extensões de arquivo permitidas
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@cotacao_routes.route('/api/cotacoes')
def get_cotacoes():
    tipo = request.args.get('tipo', 'andamento')
    if tipo == 'andamento':
        cotacoes = Cotacao.query.filter(Cotacao.status.in_([
            'Análise Comercial', 'Análise Suprimentos'])).all()
    elif tipo == 'finalizadas':
        cotacoes = Cotacao.query.filter(Cotacao.status.in_(['Liberado para Venda'])).all()
    elif tipo == 'perdidas':
        cotacoes = Cotacao.query.filter(Cotacao.status == 'Cotação Perdida').all()
    else:
        cotacoes = []
    return jsonify([cotacao.to_dict() for cotacao in cotacoes])

@cotacao_routes.route('/nova-cotacao', methods=['GET'], endpoint='nova_cotacao')
def nova_cotacao():
    return render_template('form.html', cotacao=None, status_options=STATUS_OPTIONS)

@cotacao_routes.route('/cotacao/<int:id>', methods=['GET'], endpoint='editar_cotacao')
def editar_cotacao(id):
    cotacao = Cotacao.query.get_or_404(id)
    produtos_json = [p.to_dict() for p in cotacao.produtos]
    return render_template('form.html', cotacao=cotacao, status_options=STATUS_OPTIONS, produtos_json=produtos_json)

@cotacao_routes.route('/api/cotacao', methods=['POST'])
def criar_cotacao():
    try:
        data = request.form
        
        # DEBUG: Logar todos os dados recebidos
        print("🔍 DEBUG: Dados recebidos na criação da cotação:")
        for key, value in data.items():
            print(f"  {key}: {value}")
        
        # VALIDAÇÃO ROBUSTA DOS CAMPOS OBRIGATÓRIOS
        campos_obrigatorios = {
            'nome_filial': 'Nome da Filial',
            'matricula_cooperado': 'Matrícula do Cooperado',
            'nome_cooperado': 'Nome do Cooperado',
            'analista_comercial': 'Analista Comercial',
            'nome_vendedor': 'Nome do Vendedor'
        }
        
        # Verificar campos obrigatórios
        for campo, nome_campo in campos_obrigatorios.items():
            valor = data.get(campo, '').strip()
            print(f"🔍 Validando campo {campo}: '{valor}'")
            
            # Validação específica para nome_cooperado
            if campo == 'nome_cooperado':
                valores_invalidos = [
                    'Cooperado não encontrado',
                    'Erro na busca',
                    'undefined',
                    'null',
                    ''
                ]
                if not valor or valor in valores_invalidos:
                    print(f"❌ Campo {campo} inválido: '{valor}'")
                    return jsonify({
                        'success': False,
                        'error': f'Campo obrigatório não preenchido: {campo}',
                        'details': f'O campo "{nome_campo}" não pode estar vazio ou conter valores inválidos'
                    }), 400
                else:
                    print(f"✅ Campo {campo} válido: '{valor}'")
            
            # Validação para outros campos obrigatórios
            elif not valor:
                print(f"❌ Campo {campo} vazio")
                return jsonify({
                    'success': False,
                    'error': f'Campo obrigatório não preenchido: {campo}',
                    'details': f'O campo "{nome_campo}" é obrigatório'
                }), 400
            else:
                print(f"✅ Campo {campo} válido: '{valor}'")
        
        # Validação especial para filial (não obrigatória para Regional 7)
        cultura = data.get('cultura', '').strip()
        if cultura not in ['Soja', 'Milho']:
            nome_filial = data.get('nome_filial', '').strip()
            if not nome_filial:
                return jsonify({
                    'success': False,
                    'error': 'Campo obrigatório não preenchido: nome_filial',
                    'details': 'A filial é obrigatória para culturas que não sejam Soja ou Milho'
                }), 400
        
        numero_mesorregiao = data.get('numero_mesorregiao') or data.get('mesoregiao')
        
        # Tratar prazo_entrega
        prazo_entrega = None
        prazo_str = data.get('prazo_entrega', '').strip()
        if prazo_str:
            try:
                prazo_entrega = datetime.strptime(prazo_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                prazo_entrega = None
        
        # Criar a cotação com dados validados
        cotacao = Cotacao(
            data=datetime.now(TZ_SP),
            nome_filial=data.get('nome_filial', ''),
            numero_mesorregiao=numero_mesorregiao or '',
            matricula_cooperado=data.get('matricula_cooperado', ''),
            nome_cooperado=data.get('nome_cooperado', ''),
            status=data.get('status', 'Análise Comercial'),
            analista_comercial=data.get('analista_comercial', ''),
            comprador=data.get('comprador', ''),
            observacoes=data.get('observacoes', ''),
            forma_pagamento=data.get('forma_pagamento', ''),
            prazo_entrega=prazo_entrega,
            cultura=data.get('cultura', ''),
            nome_vendedor=data.get('nome_vendedor', ''),
            motivo_venda_perdida=data.get('motivo_venda_perdida', '')
        )
        
        db.session.add(cotacao)
        db.session.flush()  # Obter ID antes de adicionar anexos
        
        # Processar anexos (múltiplos arquivos)
        arquivos = request.files.getlist('anexos[]') or request.files.getlist('anexo')
        if arquivos:
            anexos_count = 0
            for arquivo in arquivos:
                if arquivo and arquivo.filename and allowed_file(arquivo.filename):
                    if anexos_count >= MAX_ANEXOS:
                        break
                    
                    filename = secure_filename(arquivo.filename)
                    uploads_dir = os.path.join(os.getcwd(), 'uploads')
                    os.makedirs(uploads_dir, exist_ok=True)
                    filepath = os.path.join('uploads', filename)
                    arquivo.save(os.path.join(uploads_dir, filename))
                    
                    # Criar registro de anexo
                    anexo = Anexo(
                        filename=filename,
                        filepath=filepath,
                        cotacao_id=cotacao.id
                    )
                    db.session.add(anexo)
                    anexos_count += 1
        
        # Processar produtos
        produtos_json = data.get('produtos_json')
        produtos_data = []
        if produtos_json:
            produtos_data = json.loads(produtos_json)
        else:
            produtos_dict = {}
            for key in data.keys():
                if key.startswith('produtos['):
                    import re
                    m = re.match(r'produtos\[(\d+)\]\[(.+)\]', key)
                    if m:
                        idx = int(m.group(1))
                        campo = m.group(2)
                        if idx not in produtos_dict:
                            produtos_dict[idx] = {}
                        produtos_dict[idx][campo] = data[key]
            for idx in sorted(produtos_dict.keys()):
                produtos_data.append(produtos_dict[idx])
        
        def parse_money(value):
            if not value or value == '':
                return 0.0
            try:
                clean_value = str(value).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
                return float(clean_value) if clean_value else 0.0
            except:
                return 0.0
        
        for produto_data in produtos_data:
            # Tratar campo prazo_entrega_fornecedor corretamente
            prazo_entrega_fornecedor = produto_data.get('prazo_entrega_fornecedor', '')
            if prazo_entrega_fornecedor == 'null' or prazo_entrega_fornecedor == '' or prazo_entrega_fornecedor is None:
                prazo_entrega_fornecedor = None
            else:
                try:
                    prazo_entrega_fornecedor = datetime.strptime(prazo_entrega_fornecedor, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    prazo_entrega_fornecedor = None
            
            produto = ProdutoCotacao(
                cotacao_id=cotacao.id,
                sku_produto=produto_data.get('sku_produto', ''),
                nome_produto=produto_data.get('nome_produto', ''),
                volume=float(produto_data.get('volume', 0)) if produto_data.get('volume') else 0.0,
                unidade_medida=produto_data.get('unidade_medida', ''),
                preco_unitario=parse_money(produto_data.get('preco_unitario', '')),
                valor_total=parse_money(produto_data.get('valor_total', '')),
                fornecedor=produto_data.get('fornecedor', ''),
                preco_custo=parse_money(produto_data.get('preco_custo', '')),
                valor_frete=parse_money(produto_data.get('valor_frete', '')),
                prazo_entrega_fornecedor=prazo_entrega_fornecedor,
                valor_total_com_frete=parse_money(produto_data.get('valor_total_com_frete', ''))
            )
            db.session.add(produto)
        
        db.session.commit()
        
        # Enviar e-mail para o departamento correto (em background para não bloquear)
        # Capturar valores antes de iniciar a thread para evitar erro de contexto
        email_status = cotacao.status
        email_nome_cooperado = cotacao.nome_cooperado
        email_cotacao_id = cotacao.id
        
        def enviar_email_background(status, nome_cooperado, cid):
            try:
                destinatario = obter_email_por_status(status)
                destinatarios = destinatario if isinstance(destinatario, list) else [destinatario]
                enviar_email(
                    destinatarios=destinatarios,
                    assunto='Nova Cotação Criada',
                    corpo_html=f'<p>Uma nova cotação foi criada para o cooperado {nome_cooperado} (ID {cid}). Status: {status}.</p>'
                )
            except Exception as e:
                print('Erro ao enviar e-mail automático:', e)
        
        # Executar envio de e-mail em thread separada
        threading.Thread(target=enviar_email_background, args=(email_status, email_nome_cooperado, email_cotacao_id), daemon=True).start()
        
        return jsonify({'success': True, 'message': 'Cotação criada com sucesso!'})
    except Exception as e:
        db.session.rollback()
        print('ERRO:', str(e))
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@cotacao_routes.route('/api/cotacao/<int:id>', methods=['PUT', 'POST'])
def atualizar_cotacao(id):
    try:
        cotacao = Cotacao.query.get_or_404(id)
        data = request.form
        
        cotacao.nome_filial = data.get('nome_filial', cotacao.nome_filial)
        cotacao.numero_mesorregiao = data.get('numero_mesorregiao') or data.get('mesoregiao') or cotacao.numero_mesorregiao
        cotacao.matricula_cooperado = data.get('matricula_cooperado', cotacao.matricula_cooperado)
        cotacao.nome_cooperado = data.get('nome_cooperado', cotacao.nome_cooperado)
        
        novo_status = data.get('status', cotacao.status)
        if novo_status != cotacao.status:
            cotacao.status = novo_status
            cotacao.data_entrada_status = datetime.now(TZ_SP)
        
        cotacao.analista_comercial = data.get('analista_comercial', cotacao.analista_comercial)
        cotacao.comprador = data.get('comprador', cotacao.comprador)
        cotacao.observacoes = data.get('observacoes', cotacao.observacoes)
        cotacao.forma_pagamento = data.get('forma_pagamento', cotacao.forma_pagamento)
        
        # Tratar prazo_entrega corretamente como data
        prazo_str = data.get('prazo_entrega', '').strip()
        if prazo_str:
            try:
                cotacao.prazo_entrega = datetime.strptime(prazo_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                pass  # Manter valor existente
        
        cotacao.cultura = data.get('cultura', cotacao.cultura)
        cotacao.nome_vendedor = data.get('nome_vendedor', cotacao.nome_vendedor)
        cotacao.motivo_venda_perdida = data.get('motivo_venda_perdida', cotacao.motivo_venda_perdida)
        
        # Processar anexos (múltiplos arquivos)
        arquivos = request.files.getlist('anexos[]') or request.files.getlist('anexo')
        if arquivos:
            anexos_existentes = len(cotacao.anexos)
            
            for arquivo in arquivos:
                if arquivo and arquivo.filename and allowed_file(arquivo.filename):
                    # Verificar limite
                    if anexos_existentes >= MAX_ANEXOS:
                        break
                    
                    filename = secure_filename(arquivo.filename)
                    uploads_dir = os.path.join(os.getcwd(), 'uploads')
                    os.makedirs(uploads_dir, exist_ok=True)
                    filepath = os.path.join('uploads', filename)
                    arquivo.save(os.path.join(uploads_dir, filename))
                    
                    # Adicionar novo anexo ao banco
                    anexo = Anexo(
                        filename=filename,
                        filepath=filepath,
                        cotacao_id=cotacao.id
                    )
                    db.session.add(anexo)
                    anexos_existentes += 1
        
        # Atualizar produtos
        for produto in cotacao.produtos:
            db.session.delete(produto)
        
        produtos_json = data.get('produtos_json')
        if produtos_json:
            produtos_data = json.loads(produtos_json)
        else:
            produtos_data = []
        
        def parse_money(value):
            if not value or value == '':
                return 0.0
            try:
                clean_value = str(value).replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
                return float(clean_value) if clean_value else 0.0
            except:
                return 0.0
        
        for produto_data in produtos_data:
            # Tratar campo prazo_entrega_fornecedor corretamente
            prazo_entrega_fornecedor = produto_data.get('prazo_entrega_fornecedor', '')
            if prazo_entrega_fornecedor == 'null' or prazo_entrega_fornecedor == '' or prazo_entrega_fornecedor is None:
                prazo_entrega_fornecedor = None
            else:
                try:
                    prazo_entrega_fornecedor = datetime.strptime(prazo_entrega_fornecedor, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    prazo_entrega_fornecedor = None
            
            produto = ProdutoCotacao(
                cotacao_id=cotacao.id,
                sku_produto=produto_data.get('sku_produto', ''),
                nome_produto=produto_data.get('nome_produto', ''),
                volume=float(produto_data.get('volume', 0)) if produto_data.get('volume') else 0.0,
                unidade_medida=produto_data.get('unidade_medida', ''),
                preco_unitario=parse_money(produto_data.get('preco_unitario', '')),
                valor_total=parse_money(produto_data.get('valor_total', '')),
                fornecedor=produto_data.get('fornecedor', ''),
                preco_custo=parse_money(produto_data.get('preco_custo', '')),
                valor_frete=parse_money(produto_data.get('valor_frete', '')),
                prazo_entrega_fornecedor=prazo_entrega_fornecedor,
                valor_total_com_frete=parse_money(produto_data.get('valor_total_com_frete', ''))
            )
            db.session.add(produto)
        
        cotacao.data_ultima_modificacao = datetime.now(TZ_SP)
        db.session.commit()
        
        # Enviar e-mail para o departamento correto (em background para não bloquear)
        # Capturar valores antes de iniciar a thread para evitar erro de contexto
        email_status = cotacao.status
        email_nome_cooperado = cotacao.nome_cooperado
        email_cotacao_id = cotacao.id
        
        def enviar_email_background(status, nome_cooperado, cid):
            try:
                destinatario = obter_email_por_status(status)
                destinatarios = destinatario if isinstance(destinatario, list) else [destinatario]
                enviar_email(
                    destinatarios=destinatarios,
                    assunto='Cotação Atualizada',
                    corpo_html=f'<p>A cotação de ID {cid} do cooperado {nome_cooperado} foi atualizada. Status: {status}.</p>'
                )
            except Exception as e:
                print('Erro ao enviar e-mail automático:', e)
        
        # Executar envio de e-mail em thread separada
        threading.Thread(target=enviar_email_background, args=(email_status, email_nome_cooperado, email_cotacao_id), daemon=True).start()
        
        return jsonify({'success': True, 'message': 'Cotação atualizada com sucesso!'})
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@cotacao_routes.route('/api/cotacao/<int:id>', methods=['DELETE'])
def excluir_cotacao(id):
    cotacao = Cotacao.query.get_or_404(id)
    db.session.delete(cotacao)
    db.session.commit()
    return jsonify({'success': True})

@cotacao_routes.route('/api/cotacoes/excluir', methods=['POST'])
def excluir_multiplas():
    ids = request.json.get('ids', [])
    for id in ids:
        cotacao = Cotacao.query.get(id)
        if cotacao:
            db.session.delete(cotacao)
    db.session.commit()
    return jsonify({'success': True})

@cotacao_routes.route('/api/cotacao/<int:id>/exportar')
def exportar_cotacao(id):
    try:
        cotacao = Cotacao.query.get_or_404(id)
        filepath = exportar_para_excel(cotacao)
        print(f"Exportação de cotação {id} bem-sucedida. Caminho: {filepath}")
        return jsonify({'success': True, 'filepath': filepath})
    except Exception as e:
        print(f"Erro na exportação da cotação {id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@cotacao_routes.route('/api/cotacoes/exportar', methods=['POST'])
def exportar_multiplas():
    try:
        ids = request.json.get('ids', [])
        cotacoes = [Cotacao.query.get(id) for id in ids if Cotacao.query.get(id)]
        if not cotacoes:
            return jsonify({'success': False, 'error': 'Nenhuma cotação selecionada'}), 400
        filepath = exportar_para_excel(cotacoes)
        print(f"Exportação de múltiplas cotações ({len(ids)} itens) bem-sucedida. Caminho: {filepath}")
        return jsonify({'success': True, 'filepath': filepath})
    except Exception as e:
        print(f"Erro na exportação de múltiplas cotações: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@cotacao_routes.route('/api/cotacao/<int:id>', methods=['GET'])
def get_cotacao(id):
    cotacao = Cotacao.query.get_or_404(id)
    return jsonify(cotacao.to_dict())

@cotacao_routes.route('/api/anexos/<int:id>', methods=['DELETE'])
def excluir_anexo(id):
    """Excluir um anexo específico"""
    try:
        anexo = Anexo.query.get_or_404(id)
        
        # Remover arquivo físico se existir
        if anexo.filepath and os.path.exists(anexo.filepath):
            try:
                os.remove(anexo.filepath)
            except OSError:
                pass  # Ignorar erro ao remover arquivo
        
        db.session.delete(anexo)
        db.session.commit()
        return '', 204
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500