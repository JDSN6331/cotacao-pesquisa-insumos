from flask import Flask
from config import Config
from models import db
from flask_migrate import Migrate
from routes import routes, cotacao_routes, pesquisa_routes

# Criar a aplicação Flask
app = Flask(__name__)
app.config.from_object(Config)

# Inicializar extensões
db.init_app(app)
migrate = Migrate(app, db)

# Registrar blueprints de rotas
app.register_blueprint(routes, url_prefix='')
app.register_blueprint(cotacao_routes)
app.register_blueprint(pesquisa_routes)

# Inicializar banco de dados
with app.app_context():
    db.create_all()
    
    # Inicializar cache de contas
    try:
        from routes import carregar_contas_cache
        df, error = carregar_contas_cache()
        if error:
            print(f"Aviso: Cache de contas não pôde ser inicializado: {error}")
        else:
            print("Cache de contas inicializado com sucesso!")
    except Exception as e:
        print(f"Aviso: Erro ao inicializar cache de contas: {e}")
    
    # Inicializar cache de produtos
    try:
        from routes import carregar_produtos_cache
        df, error = carregar_produtos_cache()
        if error:
            print(f"Aviso: Cache de produtos não pôde ser inicializado: {error}")
        else:
            print("Cache de produtos inicializado com sucesso!")
    except Exception as e:
        print(f"Aviso: Erro ao inicializar cache de produtos: {e}")

# Executar a aplicação
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)