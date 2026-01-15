/**
 * Funcionalidade de Pesquisa no Cabeçalho
 * Permite pesquisar cotações e pesquisas por ID, Matrícula e Nome do Cooperado
 * Com filtros por status e tipo
 */

class HeaderSearch {
    constructor() {
        this.searchInput = document.getElementById('searchInput');
        this.searchButton = document.getElementById('searchButton');
        this.statusFilter = document.getElementById('statusFilter');
        this.tipoFilter = document.getElementById('tipoFilter');
        this.currentResults = [];

        this.init();
    }

    init() {
        if (!this.searchInput) return;

        // Event listeners
        this.searchInput.addEventListener('input', (e) => this.handleSearchInput(e));

        // Verificar se o botão de busca existe antes de adicionar o listener
        if (this.searchButton) {
            this.searchButton.addEventListener('click', () => this.performSearch());
        }

        this.statusFilter.addEventListener('change', () => this.performSearch());
        this.tipoFilter.addEventListener('change', () => this.performSearch());

        // Pesquisa ao pressionar Enter
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Limpar pesquisa ao pressionar Escape
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearSearch();
            }
        });

        console.log('🔍 HeaderSearch inicializado com sucesso!');
    }

    handleSearchInput(e) {
        const query = e.target.value.trim();

        // Se a query estiver vazia, limpar resultados
        if (!query) {
            this.clearSearch();
            return;
        }

        // NÃO fazer busca automática - só quando clicar na lupa ou pressionar Enter
        // Remover o debounce automático
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        const status = this.statusFilter.value;
        const tipo = this.tipoFilter.value;

        // Logs de debug
        console.log('🔍 Dados de pesquisa:', {
            query: query,
            status: status,
            tipo: tipo
        });

        if (!query) {
            this.clearSearch();
            return;
        }

        try {
            // Mostrar indicador de carregamento
            this.showLoading();

            // Fazer requisição para a API de pesquisa
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    status: status,
                    tipo: tipo
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.displayResults(data.results);
            } else {
                this.showError(data.error || 'Erro na pesquisa');
            }

        } catch (error) {
            console.error('🚨 Erro na pesquisa:', error);
            this.showError('Erro ao realizar a pesquisa. Tente novamente.');
        } finally {
            this.hideLoading();
        }
    }

    displayResults(results) {
        this.currentResults = results;

        // Criar modal de resultados se não existir
        let resultsModal = document.getElementById('searchResultsModal');
        if (!resultsModal) {
            resultsModal = this.createResultsModal();
        }

        // Atualizar conteúdo do modal
        const resultsBody = resultsModal.querySelector('#searchResultsBody');
        resultsBody.innerHTML = this.generateResultsHTML(results);

        // Mostrar modal
        const modal = new bootstrap.Modal(resultsModal);
        modal.show();

        // Atualizar contador de resultados
        this.updateResultsCount(results.length);
    }

    createResultsModal() {
        const modalHTML = `
            <div class="modal fade" id="searchResultsModal" tabindex="-1" aria-labelledby="searchResultsModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header" style="background: linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%);">
                            <h5 class="modal-title" id="searchResultsModalLabel" style="color: white;">
                                <i class="fas fa-search me-2"></i>Resultados da Pesquisa
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div id="searchResultsBody">
                                <!-- Resultados serão inseridos aqui -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        return document.getElementById('searchResultsModal');
    }

    generateResultsHTML(results) {
        if (results.length === 0) {
            return `
                <div class="text-center py-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">Nenhum resultado encontrado</h5>
                    <p class="text-muted">Tente ajustar os critérios de pesquisa</p>
                </div>
            `;
        }

        let html = `
            <div class="mb-3">
                <span class="badge bg-success">${results.length} resultado(s) encontrado(s)</span>
            </div>
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead class="table-light">
                        <tr>
                            <th>Tipo</th>
                            <th>ID</th>
                            <th>Data</th>
                            <th>Filial</th>
                            <th>Cooperado</th>
                            <th>Status</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        results.forEach(result => {
            const tipoBadge = result.tipo === 'cotacao' ?
                '<span class="badge" style="background-color: #4CAF50; color: white;">Cotação</span>' :
                '<span class="badge bg-warning text-dark">Pesquisa</span>';

            const statusBadge = this.getStatusBadge(result.status);

            html += `
                <tr>
                    <td>${tipoBadge}</td>
                    <td>#${result.id}</td>
                    <td>${this.formatDate(result.data)}</td>
                    <td>${result.filial || '-'}</td>
                    <td>
                        <div>
                            <strong>${result.nome_cooperado}</strong>
                            <br>
                            <small class="text-muted">${result.matricula_cooperado}</small>
                        </div>
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            ${this.generateActionButtons(result)}
                        </div>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        return html;
    }

    getStatusBadge(status) {
        // Função para formatar status (primeira letra maiúscula)
        function formatarStatus(status) {
            if (!status) return '-';
            // Capitalizar primeira letra de cada palavra
            const statusFormatado = status.toLowerCase().split(' ').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');

            // Correção específica para "Liberado Para Venda" -> "Liberado para Venda"
            if (statusFormatado === 'Liberado Para Venda') {
                return 'Liberado para Venda';
            }

            return statusFormatado;
        }

        const statusFormatado = formatarStatus(status);
        const statusMap = {
            'Análise Comercial': 'status-analise-comercial',
            'Análise Suprimentos': 'status-analise-suprimentos',
            'Liberado para Venda': 'status-liberado',
            'Cotação Perdida': 'status-perdida',
            'Criação': 'status-criacao'
        };

        const badgeClass = statusMap[statusFormatado] || 'status-criacao';
        return `<span class="badge ${badgeClass}">${statusFormatado}</span>`;
    }

    generateActionButtons(result) {
        const buttons = [];

        // Verificar se o status permite edição
        const statusBloqueados = ['Liberado para Venda', 'Cotação Perdida'];
        const podeEditar = !statusBloqueados.includes(result.status);

        if (podeEditar) {
            if (result.tipo === 'cotacao') {
                buttons.push(`
                    <a href="/cotacao/${result.id}" class="btn btn-sm" title="Editar Cotação" style="background: rgba(25, 135, 84, 0.2); border: 1px solid rgba(25, 135, 84, 0.3); color: #198754; backdrop-filter: blur(10px); transition: all 0.3s ease; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </a>
                `);
            } else {
                buttons.push(`
                    <a href="/pesquisa/${result.id}" class="btn btn-sm" title="Editar Pesquisa" style="background: rgba(25, 135, 84, 0.2); border: 1px solid rgba(25, 135, 84, 0.3); color: #198754; backdrop-filter: blur(10px); transition: all 0.3s ease; margin-right: 5px;">
                        <i class="fas fa-edit"></i>
                    </a>
                `);
            }
        }

        // Botão "Ver na Lista" que redireciona para a aba correta
        buttons.push(`
            <button type="button" class="btn btn-sm" title="Ver na Lista" onclick="verNaLista('${result.tipo}', '${result.status}')" style="background: rgba(13, 110, 253, 0.2); border: 1px solid rgba(13, 110, 253, 0.3); color: #0d6efd; backdrop-filter: blur(10px); transition: all 0.3s ease;">
                <i class="fas fa-list"></i>
            </button>
        `);

        return buttons.join('');
    }

    formatDate(dateString) {
        if (!dateString) return '-';

        // Se já vier no formato dd/mm/aaaa, retorna como está
        const brDateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
        if (brDateRegex.test(dateString)) {
            return dateString;
        }

        try {
            const date = new Date(dateString);
            // Tratar valores inválidos explicitamente
            if (isNaN(date.getTime())) {
                return dateString;
            }
            return date.toLocaleDateString('pt-BR');
        } catch (error) {
            return dateString;
        }
    }

    updateResultsCount(count) {
        // Atualizar o placeholder do campo de pesquisa com o número de resultados
        if (count > 0) {
            this.searchInput.placeholder = `${count} resultado(s) encontrado(s)`;
            this.searchInput.classList.add('is-valid');
        } else {
            this.searchInput.placeholder = 'Pesquisar por Matrícula ou Nome do Cooperado...';
            this.searchInput.classList.remove('is-valid');
        }
    }

    clearSearch() {
        this.searchInput.value = '';
        this.searchInput.placeholder = 'Pesquisar por Matrícula ou Nome do Cooperado...';
        this.searchInput.classList.remove('is-valid', 'is-invalid');
        this.currentResults = [];

        // Fechar modal se estiver aberto
        const modal = document.getElementById('searchResultsModal');
        if (modal) {
            const bootstrapModal = bootstrap.Modal.getInstance(modal);
            if (bootstrapModal) {
                bootstrapModal.hide();
            }
        }
    }

    showLoading() {
        this.searchButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.searchButton.disabled = true;
        this.searchInput.classList.add('is-loading');
    }

    hideLoading() {
        this.searchButton.innerHTML = '<i class="fas fa-search"></i>';
        this.searchButton.disabled = false;
        this.searchInput.classList.remove('is-loading');
    }

    showError(message) {
        this.searchInput.classList.add('is-invalid');
        this.searchInput.placeholder = message;

        // Remover classe de erro após 3 segundos
        setTimeout(() => {
            this.searchInput.classList.remove('is-invalid');
            this.searchInput.placeholder = 'Pesquisar por Matrícula ou Nome do Cooperado...';
        }, 3000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function () {
    new HeaderSearch();
    verificarRedirecionamentoPendente(); // Verificar redirecionamento pendente ao carregar a página
});

// Função global para redirecionar para a aba correta
function verNaLista(tipo, status) {
    console.log(`🚀 Redirecionando para aba: ${tipo} com status ${status}`);

    // Salvar informações no localStorage para usar após o redirecionamento
    localStorage.setItem('redirecionarAba', JSON.stringify({
        tipo: tipo,
        status: status,
        timestamp: Date.now()
    }));

    // Fechar o modal de resultados
    const modal = document.getElementById('searchResultsModal');
    if (modal) {
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        if (bootstrapModal) {
            bootstrapModal.hide();
        }
    }

    // Redirecionar para a página principal
    window.location.href = '/';
}

// Função para ativar a aba correta baseada no tipo e status
function ativarAbaCorreta(tipo, status) {
    console.log(`🔧 Tentando ativar aba para: ${tipo} com status ${status}`);

    let cardType = '';

    if (tipo === 'cotacao') {
        if (status === 'Liberado para Venda') {
            cardType = 'finalizadas';
        } else if (status === 'Cotação Perdida') {
            cardType = 'perdidas';
        } else {
            // Análise Comercial, Análise Suprimentos
            cardType = 'andamento';
        }
    } else if (tipo === 'pesquisa') {
        if (status === 'Liberado para Venda') {
            cardType = 'pesquisas-finalizadas';
        } else {
            // Análise Comercial
            cardType = 'pesquisas';
        }
    }

    console.log(`🎯 Card selecionado: ${cardType}`);

    // Ativar o card correto se encontrado
    if (cardType) {
        const card = document.querySelector(`[data-type="${cardType}"]`);
        if (card) {
            console.log(`✅ Card encontrado: ${cardType}`);

            try {
                // Remover classe active de todos os cards
                document.querySelectorAll('.overview-card').forEach(c => {
                    c.classList.remove('active');
                });

                // Adicionar classe active ao card correto
                card.classList.add('active');

                // Remover classe active de todos os content-cards
                document.querySelectorAll('.content-card').forEach(c => {
                    c.classList.remove('active');
                });

                // Ativar o content-card correspondente
                const contentCard = document.getElementById(`content-${cardType}`);
                if (contentCard) {
                    contentCard.classList.add('active');
                }

                // Carregar dados correspondentes
                if (typeof carregarDadosPorTipo === 'function') {
                    carregarDadosPorTipo(cardType);
                }

                // Atualizar descrição
                if (typeof atualizarDescricaoCard === 'function') {
                    atualizarDescricaoCard(cardType);
                }

                console.log(`🎉 Card ativado com sucesso: ${cardType} para ${tipo} com status ${status}`);

                // Limpar localStorage após sucesso
                localStorage.removeItem('redirecionarAba');

                // Mostrar feedback visual
                mostrarFeedbackAbaAtivada(card);

            } catch (error) {
                console.error('❌ Erro ao ativar card:', error);
                // Fallback: tentar ativar manualmente
                ativarCardManualmente(cardType);
            }
        } else {
            console.error(`❌ Card não encontrado: ${cardType}`);
        }
    } else {
        console.error(`❌ Tipo ou status não reconhecido: ${tipo} - ${status}`);
    }
}

// Função fallback para ativar card manualmente
function ativarCardManualmente(cardType) {
    console.log(`🔧 Tentando ativação manual do card: ${cardType}`);

    // Remover todas as classes active dos cards
    document.querySelectorAll('.overview-card').forEach(card => {
        card.classList.remove('active');
    });

    // Remover todas as classes active dos content-cards
    document.querySelectorAll('.content-card').forEach(content => {
        content.classList.remove('active');
    });

    // Ativar o card desejado
    const card = document.querySelector(`[data-type="${cardType}"]`);
    if (card) {
        card.classList.add('active');

        // Ativar o content-card correspondente
        const contentCard = document.getElementById(`content-${cardType}`);
        if (contentCard) {
            contentCard.classList.add('active');
            console.log(`✅ Card ativado manualmente: ${cardType}`);
        }
    }
}

// Função para mostrar feedback visual do card ativado
function mostrarFeedbackAbaAtivada(card) {
    if (card) {
        // Adicionar efeito visual temporário
        card.style.transform = 'scale(1.05)';
        card.style.transition = 'transform 0.3s ease';

        setTimeout(() => {
            card.style.transform = 'scale(1)';
        }, 300);

        // Scroll para o card se necessário
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Função para verificar e processar redirecionamento pendente
function verificarRedirecionamentoPendente() {
    const redirecionamento = localStorage.getItem('redirecionarAba');

    if (redirecionamento) {
        try {
            const dados = JSON.parse(redirecionamento);
            const agora = Date.now();
            const tempoDecorrido = agora - dados.timestamp;

            // Só processar se foi feito nos últimos 5 segundos
            if (tempoDecorrido < 5000) {
                console.log(`🔄 Processando redirecionamento pendente: ${dados.tipo} - ${dados.status}`);

                // Aguardar um pouco mais para garantir que o DOM está pronto
                setTimeout(() => {
                    ativarAbaCorreta(dados.tipo, dados.status);
                }, 500);
            } else {
                // Limpar redirecionamento antigo
                localStorage.removeItem('redirecionarAba');
            }
        } catch (error) {
            console.error('❌ Erro ao processar redirecionamento:', error);
            localStorage.removeItem('redirecionarAba');
        }
    }
}

// Exportar para uso global se necessário
window.HeaderSearch = HeaderSearch;
window.verNaLista = verNaLista;
window.ativarAbaCorreta = ativarAbaCorreta;
window.ativarCardManualmente = ativarCardManualmente;
window.mostrarFeedbackAbaAtivada = mostrarFeedbackAbaAtivada;
window.verificarRedirecionamentoPendente = verificarRedirecionamentoPendente;
