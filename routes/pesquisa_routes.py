from flask import Blueprint, render_template, request, jsonify
from models import db, PesquisaMercado, Anexo, MAX_ANEXOS
from services.utils import exportar_para_excel
from datetime import datetime
import os
import pytz
from werkzeug.utils import secure_filename
import json
import traceback
from services.email_service import enviar_email, obter_email_por_status

pesquisa_routes = Blueprint('pesquisa_routes', __name__)

PESQUISA_STATUS_OPTIONS = [
    'Análise Comercial',
    'Liberado para Venda'
]

TZ_SP = pytz.timezone('America/Sao_Paulo')

# Extensões de arquivo permitidas
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@pesquisa_routes.route('/nova-pesquisa')
def nova_pesquisa():
    return render_template('pesquisa_form.html', status_options=PESQUISA_STATUS_OPTIONS)

@pesquisa_routes.route('/api/pesquisas', methods=['POST'])
def criar_pesquisa():
    try:
        def parse_float(val):
            try:
                return float(str(val).replace('R$', '').replace('.', '').replace(',', '.')) if val not in (None, '', 'null') else None
            except Exception:
                return None
        
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form
        else:
            data = request.get_json()
            
        data_pesquisa = datetime.now(TZ_SP).date()
        quantidade_cotada_parsed = parse_float(data.get('quantidade_cotada'))
        valor_concorrente_parsed = parse_float(data.get('valor_concorrente'))
        valor_cooxupe_parsed = parse_float(data.get('valor_cooxupe'))
        
        if not data_pesquisa or \
           not data.get('nome_filial') or \
           not data.get('numero_mesorregiao') or \
           not data.get('matricula_cooperado') or \
           not data.get('nome_cooperado') or \
           not data.get('nome_produto') or \
           quantidade_cotada_parsed is None or \
           not data.get('forma_pagamento') or \
           not data.get('nome_concorrente') or \
           valor_concorrente_parsed is None or \
           not data.get('status'):
             return jsonify({'error': 'Preencha todos os campos obrigatórios.'}), 400
        
        pesquisa_id = data.get('id')
        if pesquisa_id:
            pesquisa = PesquisaMercado.query.get(pesquisa_id)
            if not pesquisa:
                return jsonify({'error': 'Pesquisa não encontrada.'}), 404
            pesquisa.data = data_pesquisa
            pesquisa.nome_filial = data.get('nome_filial', '')
            pesquisa.numero_mesorregiao = data.get('numero_mesorregiao', '')
            pesquisa.matricula_cooperado = data.get('matricula_cooperado', '')
            pesquisa.nome_cooperado = data.get('nome_cooperado', '')
            pesquisa.codigo_produto = data.get('codigo_produto', '')
            pesquisa.nome_produto = data.get('nome_produto', '')
            pesquisa.quantidade_cotada = quantidade_cotada_parsed
            pesquisa.forma_pagamento = data.get('forma_pagamento', '')
            pesquisa.nome_concorrente = data.get('nome_concorrente', '')
            pesquisa.valor_concorrente = valor_concorrente_parsed
            pesquisa.valor_cooxupe = valor_cooxupe_parsed
            pesquisa.analista_comercial = data.get('analista_comercial', '')
            pesquisa.observacoes = data.get('observacoes', '')
            
            # Campos adicionais - Tratamento correto
            cultura_value = data.get('cultura', '')
            pesquisa.cultura = cultura_value if cultura_value and cultura_value.strip() and cultura_value != 'undefined' else None
            
            nome_vendedor_value = data.get('nome_vendedor', '')
            pesquisa.nome_vendedor = nome_vendedor_value if nome_vendedor_value and nome_vendedor_value.strip() and nome_vendedor_value != 'undefined' else None
            
            comprador_value = data.get('comprador', '')
            pesquisa.comprador = comprador_value if comprador_value and comprador_value.strip() and comprador_value != 'undefined' else None
            
            # Tratar prazo de entrega
            prazo_entrega_str = data.get('prazo_entrega', '')
            if prazo_entrega_str and str(prazo_entrega_str).strip() and prazo_entrega_str != 'undefined':
                try:
                    pesquisa.prazo_entrega = datetime.strptime(str(prazo_entrega_str), '%Y-%m-%d').date()
                except ValueError:
                    pesquisa.prazo_entrega = None
            else:
                pesquisa.prazo_entrega = None
            
            # Atualizar status
            novo_status = data.get('status', pesquisa.status)
            if novo_status != pesquisa.status:
                pesquisa.status = novo_status
                pesquisa.data_entrada_status = datetime.now(TZ_SP)
            
        else:
            # Criar nova pesquisa
            # Tratar campos adicionais
            cultura_value = data.get('cultura', '')
            nome_vendedor_value = data.get('nome_vendedor', '')
            comprador_value = data.get('comprador', '')
            
            pesquisa = PesquisaMercado(
                data=data_pesquisa,
                nome_filial=data.get('nome_filial', ''),
                numero_mesorregiao=data.get('numero_mesorregiao', ''),
                matricula_cooperado=data.get('matricula_cooperado', ''),
                nome_cooperado=data.get('nome_cooperado', ''),
                codigo_produto=data.get('codigo_produto', ''),
                nome_produto=data.get('nome_produto', ''),
                quantidade_cotada=quantidade_cotada_parsed,
                forma_pagamento=data.get('forma_pagamento', ''),
                nome_concorrente=data.get('nome_concorrente', ''),
                valor_concorrente=valor_concorrente_parsed,
                valor_cooxupe=valor_cooxupe_parsed,
                analista_comercial=data.get('analista_comercial', ''),
                observacoes=data.get('observacoes', ''),
                status=data.get('status', 'Análise Comercial'),
                data_entrada_status=datetime.now(TZ_SP),
                data_ultima_modificacao=datetime.now(TZ_SP),
                cultura=cultura_value if cultura_value and cultura_value.strip() else None,
                nome_vendedor=nome_vendedor_value if nome_vendedor_value and nome_vendedor_value.strip() else None,
                comprador=comprador_value if comprador_value and comprador_value.strip() else None,
                prazo_entrega=None
            )
            
            # Tratar prazo de entrega
            prazo_entrega_str = data.get('prazo_entrega', '')
            if prazo_entrega_str and prazo_entrega_str.strip():
                try:
                    pesquisa.prazo_entrega = datetime.strptime(prazo_entrega_str, '%Y-%m-%d').date()
                except ValueError:
                    pesquisa.prazo_entrega = None
            
            db.session.add(pesquisa)
        
        db.session.flush()  # Obter ID da pesquisa antes de adicionar anexos
        
        # Processar anexos (múltiplos arquivos)
        arquivos = request.files.getlist('anexos[]') or request.files.getlist('anexo')
        if arquivos:
            anexos_existentes = len(pesquisa.anexos) if pesquisa_id else 0
            
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
                    
                    # Criar registro de anexo
                    anexo = Anexo(
                        filename=filename,
                        filepath=filepath,
                        pesquisa_id=pesquisa.id
                    )
                    db.session.add(anexo)
                    anexos_existentes += 1
        
        db.session.commit()
        
        # Enviar e-mail para o departamento correto
        try:
            destinatario = obter_email_por_status(pesquisa.status)
            # Se for lista de e-mails, usar diretamente; senão, criar lista
            destinatarios = destinatario if isinstance(destinatario, list) else [destinatario]
            enviar_email(
                destinatarios=destinatarios,
                assunto='Nova Pesquisa Criada' if not pesquisa_id else 'Pesquisa Atualizada',
                corpo_html=f'<p>Uma pesquisa foi {"criada" if not pesquisa_id else "atualizada"} para o cooperado {pesquisa.nome_cooperado} (ID {pesquisa.id}). Status: {pesquisa.status}.</p>'
            )
        except Exception as e:
            print('Erro ao enviar e-mail automático:', e)
        
        return jsonify({'id': pesquisa.id})
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': f'Erro ao salvar pesquisa: {str(e)}'}), 400

@pesquisa_routes.route('/api/pesquisas/<status>', methods=['GET'])
def listar_pesquisas(status):
    try:
        if status == 'pesquisa':
            pesquisas = PesquisaMercado.query.filter_by(status='Análise Comercial').all()
        elif status == 'finalizadas':
            pesquisas = PesquisaMercado.query.filter_by(status='Liberado para Venda').all()
        else:
            return jsonify([])
        for pesquisa in pesquisas:
            if not hasattr(pesquisa, 'data_ultima_modificacao'):
                pesquisa.data_ultima_modificacao = pesquisa.data_entrada_status
        return jsonify([pesquisa.to_dict() for pesquisa in pesquisas])
    except Exception as e:
        print(f"Erro ao listar pesquisas: {str(e)}")
        return jsonify([])

@pesquisa_routes.route('/api/pesquisas/<int:id>', methods=['PUT'])
def atualizar_pesquisa(id):
    try:
        pesquisa = PesquisaMercado.query.get_or_404(id)
        
        def parse_float(val):
            try:
                return float(str(val).replace('R$', '').replace('.', '').replace(',', '.')) if val not in (None, '', 'null') else None
            except Exception:
                return None
        
        if request.content_type and request.content_type.startswith('multipart/form-data'):
            data = request.form
        else:
            data = request.get_json()
        
        # Atualizar campos básicos usando data.get() para evitar KeyError
        data_str = data.get('data', '')
        if data_str:
            try:
                pesquisa.data = datetime.strptime(data_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        pesquisa.nome_filial = data.get('nome_filial', pesquisa.nome_filial)
        pesquisa.numero_mesorregiao = data.get('numero_mesorregiao', pesquisa.numero_mesorregiao)
        pesquisa.matricula_cooperado = data.get('matricula_cooperado', pesquisa.matricula_cooperado)
        pesquisa.nome_cooperado = data.get('nome_cooperado', pesquisa.nome_cooperado)
        pesquisa.codigo_produto = data.get('codigo_produto', pesquisa.codigo_produto)
        pesquisa.nome_produto = data.get('nome_produto', pesquisa.nome_produto)
        
        qtd = data.get('quantidade_cotada')
        if qtd is not None:
            pesquisa.quantidade_cotada = parse_float(qtd) or pesquisa.quantidade_cotada
            
        pesquisa.forma_pagamento = data.get('forma_pagamento', pesquisa.forma_pagamento)
        pesquisa.nome_concorrente = data.get('nome_concorrente', pesquisa.nome_concorrente)
        
        valor_conc = data.get('valor_concorrente')
        if valor_conc is not None:
            pesquisa.valor_concorrente = parse_float(valor_conc) or pesquisa.valor_concorrente
            
        valor_coox = data.get('valor_cooxupe')
        if valor_coox is not None:
            pesquisa.valor_cooxupe = parse_float(valor_coox)
            
        pesquisa.analista_comercial = data.get('analista_comercial', pesquisa.analista_comercial)
        pesquisa.observacoes = data.get('observacoes', pesquisa.observacoes)
        
        # Campos adicionais - CORREÇÃO: Usar data.get() e manter valores existentes se não fornecidos
        cultura_value = data.get('cultura')
        if cultura_value is not None:
            pesquisa.cultura = cultura_value if cultura_value and cultura_value.strip() else pesquisa.cultura
        
        nome_vendedor_value = data.get('nome_vendedor')
        if nome_vendedor_value is not None:
            pesquisa.nome_vendedor = nome_vendedor_value if nome_vendedor_value and nome_vendedor_value.strip() else pesquisa.nome_vendedor
        
        comprador_value = data.get('comprador')
        if comprador_value is not None:
            pesquisa.comprador = comprador_value if comprador_value and comprador_value.strip() else pesquisa.comprador
        
        # Tratar prazo de entrega
        prazo_entrega_str = data.get('prazo_entrega')
        if prazo_entrega_str is not None:
            if prazo_entrega_str and prazo_entrega_str.strip():
                try:
                    pesquisa.prazo_entrega = datetime.strptime(prazo_entrega_str, '%Y-%m-%d').date()
                except ValueError:
                    pass  # Manter valor existente
            # Se o valor for vazio mas foi enviado, limpar
            else:
                pesquisa.prazo_entrega = None
        
        # Atualizar status
        novo_status = data.get('status')
        if novo_status and novo_status != pesquisa.status:
            pesquisa.status = novo_status
            pesquisa.data_entrada_status = datetime.now(TZ_SP)
        
        # Processar anexos (múltiplos arquivos)
        arquivos = request.files.getlist('anexos[]') or request.files.getlist('anexo')
        if arquivos:
            anexos_existentes = len(pesquisa.anexos)
            
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
                    
                    # Criar registro de anexo
                    anexo = Anexo(
                        filename=filename,
                        filepath=filepath,
                        pesquisa_id=pesquisa.id
                    )
                    db.session.add(anexo)
                    anexos_existentes += 1
        
        pesquisa.data_ultima_modificacao = datetime.now(TZ_SP)
        db.session.commit()
        
        # Enviar e-mail para o departamento correto
        try:
            destinatario = obter_email_por_status(pesquisa.status)
            # Se for lista de e-mails, usar diretamente; senão, criar lista
            destinatarios = destinatario if isinstance(destinatario, list) else [destinatario]
            enviar_email(
                destinatarios=destinatarios,
                assunto='Pesquisa Atualizada',
                corpo_html=f'<p>A pesquisa de ID {pesquisa.id} do cooperado {pesquisa.nome_cooperado} foi atualizada. Status: {pesquisa.status}.</p>'
            )
        except Exception as e:
            print('Erro ao enviar e-mail automático:', e)
        
        return jsonify(pesquisa.to_dict())
    except Exception as e:
        db.session.rollback()
        traceback.print_exc()
        return jsonify({'error': f'Erro ao atualizar pesquisa: {str(e)}'}), 400

@pesquisa_routes.route('/api/pesquisas/<int:id>', methods=['DELETE'])
def excluir_pesquisa(id):
    pesquisa = PesquisaMercado.query.get_or_404(id)
    db.session.delete(pesquisa)
    db.session.commit()
    return '', 204

@pesquisa_routes.route('/pesquisa/<int:id>')
def editar_pesquisa(id):
    pesquisa = PesquisaMercado.query.get_or_404(id)
    return render_template('pesquisa_form.html', pesquisa=pesquisa, status_options=PESQUISA_STATUS_OPTIONS)

@pesquisa_routes.route('/api/pesquisa/<int:id>/exportar')
def exportar_pesquisa(id):
    try:
        pesquisa = PesquisaMercado.query.get_or_404(id)
        filepath = exportar_para_excel(pesquisa)
        print(f"Exportação de pesquisa {id} bem-sucedida. Caminho: {filepath}")
        return jsonify({'success': True, 'filepath': filepath})
    except Exception as e:
        print(f"Erro na exportação da pesquisa {id}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500 

@pesquisa_routes.route('/api/pesquisas/exportar', methods=['POST'])
def exportar_multiplas_pesquisas():
    try:
        ids = request.json.get('ids', [])
        if not isinstance(ids, list) or not ids:
            return jsonify({'success': False, 'error': 'Nenhuma pesquisa selecionada'}), 400
        pesquisas = [PesquisaMercado.query.get(pid) for pid in ids]
        pesquisas = [p for p in pesquisas if p]
        if not pesquisas:
            return jsonify({'success': False, 'error': 'Pesquisas não encontradas'}), 404
        filepath = exportar_para_excel(pesquisas)
        return jsonify({'success': True, 'filepath': filepath})
    except Exception as e:
        print(f"Erro na exportação de múltiplas pesquisas: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@pesquisa_routes.route('/api/anexos/<int:id>', methods=['DELETE'])
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