from flask import Blueprint, render_template, request, jsonify, send_file, abort
from services.utils import carregar_filiais_mesoregioes, carregar_contas_cache, carregar_produtos_cache
from urllib.parse import unquote
import os
import pandas as pd
from models import db, Cotacao, PesquisaMercado

# Blueprint com nome 'routes' para manter compatibilidade com templates
main_routes = Blueprint('routes', __name__)

@main_routes.route('/', endpoint='index')
def index():
    return render_template('index.html')

@main_routes.route('/api/dashboard/stats')
def dashboard_stats():
    """Retorna contadores para os cards do dashboard"""
    try:
        stats = {
            'andamento': Cotacao.query.filter(Cotacao.status.in_(['Análise Comercial', 'Análise Suprimentos'])).count(),
            'pesquisas': PesquisaMercado.query.filter_by(status='Análise Comercial').count(),
            'finalizadas': Cotacao.query.filter_by(status='Liberado para Venda').count(),
            'pesquisas_finalizadas': PesquisaMercado.query.filter_by(status='Liberado para Venda').count(),
            'perdidas': Cotacao.query.filter_by(status='Cotação Perdida').count()
        }
        return jsonify(stats)
    except Exception as e:
        print(f"Erro ao carregar stats: {e}")
        return jsonify({
            'andamento': 0,
            'pesquisas': 0,
            'finalizadas': 0,
            'pesquisas_finalizadas': 0,
            'perdidas': 0
        })

@main_routes.route('/download/<path:filename>')
def download_file(filename):
    filename = unquote(filename)
    filename = filename.replace('\\', '/').replace('..', '')
    uploads_path = os.path.join('uploads', filename)
    cotacoes_path = os.path.join('exports', filename)
    if os.path.isfile(uploads_path):
        return send_file(uploads_path, as_attachment=True)
    elif os.path.isfile(cotacoes_path):
        return send_file(cotacoes_path, as_attachment=True)
    else:
        abort(404, description='Arquivo não encontrado.')

@main_routes.route('/api/filiais', methods=['GET'])
def get_filiais():
    opcoes = carregar_filiais_mesoregioes()
    return jsonify(opcoes)

@main_routes.route('/api/produtos/buscar')
def buscar_produto():
    codigo = request.args.get('codigo')
    nome = request.args.get('nome')
    
    df, error = carregar_produtos_cache()
    if error:
        return jsonify({'success': False, 'error': error}), 500
        
    try:
        # Busca por código
        if codigo:
            # Buscar exato primeiro (convertendo para string para garantir)
            resultado = df[df['Código do produto'].astype(str) == str(codigo)]
            if not resultado.empty:
                prod = resultado.iloc[0]
                return jsonify({
                    'success': True,
                    'tipo_busca': 'codigo',
                    'nome': prod['Nome do produto'],
                    'codigo': prod['Código do produto']
                })
            else:
                return jsonify({'success': False, 'error': 'Produto não encontrado'})
                
        # Busca por nome
        elif nome:
            # Filtrar (case insensitive)
            mask = df['Nome do produto'].astype(str).str.contains(nome, case=False, regex=False, na=False)
            resultados = df[mask]
            
            if not resultados.empty:
                # Limitar a 10 resultados para performance
                lista_resultados = []
                for _, row in resultados.head(10).iterrows():
                    lista_resultados.append({
                        'nome': row['Nome do produto'],
                        'codigo': row['Código do produto']
                    })
                    
                return jsonify({
                    'success': True,
                    'tipo_busca': 'nome',
                    'resultados': lista_resultados,
                    # Retornam o primeiro para compatibilidade se o front esperar um único
                    'nome': lista_resultados[0]['nome'],
                    'codigo': lista_resultados[0]['codigo']
                })
            else:
                return jsonify({'success': False, 'error': 'Produto não encontrado'})
                
        else:
            return jsonify({'success': False, 'error': 'Parâmetros inválidos'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@main_routes.route('/api/cooperados/buscar')
def buscar_cooperado():
    matricula = request.args.get('matricula')
    nome = request.args.get('nome')
    
    df, error = carregar_contas_cache()
    if error:
        return jsonify({'success': False, 'error': error}), 500
        
    try:
        # Busca por matrícula
        if matricula:
            resultado = df[df['Matricula'].astype(str) == str(matricula)]
            if not resultado.empty:
                conta = resultado.iloc[0]
                return jsonify({
                    'success': True,
                    'tipo_busca': 'matricula',
                    'nome': conta['Nome da conta'],
                    'matricula': conta['Matricula']
                })
            else:
                return jsonify({'success': False, 'error': 'Cooperado não encontrado'})
                
        # Busca por nome
        elif nome:
            mask = df['Nome da conta'].astype(str).str.contains(nome, case=False, regex=False, na=False)
            resultados = df[mask]
            
            if not resultados.empty:
                lista_resultados = []
                for _, row in resultados.head(10).iterrows():
                    lista_resultados.append({
                        'nome': row['Nome da conta'],
                        'matricula': row['Matricula']
                    })
                    
                return jsonify({
                    'success': True,
                    'tipo_busca': 'nome',
                    'resultados': lista_resultados,
                    'nome': lista_resultados[0]['nome'],
                    'matricula': lista_resultados[0]['matricula']
                })
            else:
                return jsonify({'success': False, 'error': 'Cooperado não encontrado'})
                
        else:
            return jsonify({'success': False, 'error': 'Parâmetros inválidos'}), 400
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
 