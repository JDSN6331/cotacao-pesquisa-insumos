document.addEventListener('DOMContentLoaded', function () {
    let currentStep = 1;
    const totalSteps = 3;
    let produtos = [];

    // Função para controlar bloqueio de campos por fase (Melhoria 11)
    function controlarCamposPorFase() {
        const statusAtual = document.getElementById('statusAtual').value;
        console.log('Status atual da cotação:', statusAtual);

        // Definir campos que devem ser bloqueados
        const camposBloqueados = [
            'comprador', // Campo do passo 1
            // Campos dos produtos (serão tratados dinamicamente)
        ];

        // Regras de bloqueio por fase
        if (statusAtual === 'Criação' || statusAtual === 'Análise Comercial') {
            // Bloquear campos nas fases de Criação e Análise Comercial
            console.log('Bloqueando campos para fase:', statusAtual);

            // Bloquear campo Comprador do passo 1
            const compradorField = document.getElementById('comprador');
            if (compradorField) {
                compradorField.disabled = true;
                compradorField.classList.add('campo-bloqueado');
            }

            // Bloquear campos dos produtos
            produtos.forEach(index => {
                bloquearCamposProduto(index);
            });

        } else if (statusAtual === 'Análise Suprimentos') {
            // Liberar todos os campos na fase de Análise Suprimentos
            console.log('Liberando todos os campos para fase:', statusAtual);

            // Liberar campo Comprador do passo 1
            const compradorField = document.getElementById('comprador');
            if (compradorField) {
                compradorField.disabled = false;
                compradorField.classList.remove('campo-bloqueado');
            }

            // Liberar campos dos produtos
            produtos.forEach(index => {
                liberarCamposProduto(index);
            });
        }
    }

    // Função para bloquear campos de um produto específico
    function bloquearCamposProduto(index) {
        const camposParaBloquear = [
            `preco_unitario_${index}`,
            `valor_total_${index}`,
            `fornecedor_${index}`,
            `preco_custo_${index}`,
            `valor_frete_${index}`,
            `valor_total_com_frete_${index}`,
            `prazo_entrega_fornecedor_${index}`
        ];

        camposParaBloquear.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.disabled = true;
                campo.classList.add('campo-bloqueado');
                console.log(`Campo ${campoId} bloqueado`);
            }
        });
    }

    // Função para liberar campos de um produto específico
    function liberarCamposProduto(index) {
        const camposParaLiberar = [
            `preco_unitario_${index}`,
            `valor_total_${index}`,
            `fornecedor_${index}`,
            `preco_custo_${index}`,
            `valor_frete_${index}`,
            `valor_total_com_frete_${index}`,
            `prazo_entrega_fornecedor_${index}`
        ];

        camposParaLiberar.forEach(campoId => {
            const campo = document.getElementById(campoId);
            if (campo) {
                campo.disabled = false;
                campo.classList.remove('campo-bloqueado');
                console.log(`Campo ${campoId} liberado`);
            }
        });
    }

    // Função para mostrar/esconder etapas
    function showStep(step) {
        document.querySelectorAll('.step').forEach((el, index) => {
            el.style.display = index + 1 === step ? 'block' : 'none';
        });
        updateNavigationButtons();

        // Se for o passo 1, carregar filiais e configurar listeners
        if (step === 1) {
            setupFiliais();
            setupCulturaListener();
        }
    }

    // Inicializar controle de campos por fase
    controlarCamposPorFase();

    // Listener para mudanças no status da cotação
    document.getElementById('status').addEventListener('change', function () {
        // Atualizar o campo hidden com o novo status
        document.getElementById('statusAtual').value = this.value;
        // Reaplicar controle de campos por fase
        controlarCamposPorFase();
    });

    // Função para atualizar botões de navegação
    function updateNavigationButtons() {
        const prevButton = document.getElementById('prevButton');
        const nextButton = document.getElementById('nextButton');

        prevButton.style.display = currentStep === 1 ? 'none' : 'inline-block';
        nextButton.textContent = currentStep === totalSteps ? 'Finalizar' : 'Avançar';

        // Atualizar ícones dos botões
        if (currentStep === totalSteps) {
            nextButton.innerHTML = 'Finalizar<i class="fas fa-check ms-2"></i>';
        } else {
            nextButton.innerHTML = 'Avançar<i class="fas fa-arrow-right ms-2"></i>';
        }
    }

    // Função para adicionar novo produto
    function addProduto(produtoData) {
        const produtosContainer = document.getElementById('produtosContainer');
        const produtoIndex = produtos.length;

        const produtoHtml = `
            <div class="produto-item" id="produto-${produtoIndex}">
                <h4 class="mb-4">Produto ${produtoIndex + 1}</h4>
                <div class="row">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="sku_produto_${produtoIndex}" class="form-label">Código do Produto <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="sku_produto_${produtoIndex}" name="produtos[${produtoIndex}][sku_produto]" required>
                            <div id="loading_codigo_produto_${produtoIndex}" class="text-muted small" style="display: none;">
                                <i class="fas fa-spinner fa-spin"></i> Buscando produto...
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="nome_produto_${produtoIndex}" class="form-label">Nome do Produto <span class="text-danger">*</span></label>
                            <input type="text" class="form-control" id="nome_produto_${produtoIndex}" name="produtos[${produtoIndex}][nome_produto]" required>
                            <div id="loading_nome_produto_${produtoIndex}" class="text-muted small" style="display: none;">
                                <i class="fas fa-spinner fa-spin"></i> Buscando produto...
                            </div>
                            <div id="sugestoes_produto_${produtoIndex}" class="mt-2" style="display: none;">
                                <div class="list-group">
                                    <!-- Sugestões serão inseridas aqui -->
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="volume_${produtoIndex}" class="form-label">Volume <span class="text-danger">*</span></label>
                            <input type="number" step="0.01" class="form-control" id="volume_${produtoIndex}" name="produtos[${produtoIndex}][volume]" required>
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="unidade_medida_${produtoIndex}" class="form-label">Unidade de Medida <span class="text-danger">*</span></label>
                            <select class="form-select" id="unidade_medida_${produtoIndex}" name="produtos[${produtoIndex}][unidade_medida]" required>
                                <option value="Kg/l">Kg/l</option>
                                <option value="TN">TN</option>
                            </select>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="preco_unitario_${produtoIndex}" class="form-label">Preço Unitário (R$)</label>
                            <input type="text" class="form-control money-input" id="preco_unitario_${produtoIndex}" name="produtos[${produtoIndex}][preco_unitario]" placeholder="R$ 0,00">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="valor_total_${produtoIndex}" class="form-label">Valor Total (R$)</label>
                            <input type="text" class="form-control money-input" id="valor_total_${produtoIndex}" name="produtos[${produtoIndex}][valor_total]" readonly placeholder="R$ 0,00">
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="fornecedor_${produtoIndex}" class="form-label">Fornecedor</label>
                            <input type="text" class="form-control" id="fornecedor_${produtoIndex}" name="produtos[${produtoIndex}][fornecedor]">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="preco_custo_${produtoIndex}" class="form-label">Preço de Custo (R$)</label>
                            <input type="text" class="form-control money-input" id="preco_custo_${produtoIndex}" name="produtos[${produtoIndex}][preco_custo]" placeholder="R$ 0,00">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="valor_frete_${produtoIndex}" class="form-label">Valor do Frete (R$)</label>
                            <input type="text" class="form-control money-input" id="valor_frete_${produtoIndex}" name="produtos[${produtoIndex}][valor_frete]" placeholder="R$ 0,00">
                        </div>
                    </div>
                </div>
                <div class="row mt-3">
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="prazo_entrega_fornecedor_${produtoIndex}" class="form-label">Prazo de Entrega Fornecedor</label>
                            <input type="date" class="form-control" id="prazo_entrega_fornecedor_${produtoIndex}" name="produtos[${produtoIndex}][prazo_entrega_fornecedor]">
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="form-group">
                            <label for="valor_total_com_frete_${produtoIndex}" class="form-label">Valor Total com Frete (R$)</label>
                            <input type="text" class="form-control money-input" id="valor_total_com_frete_${produtoIndex}" name="produtos[${produtoIndex}][valor_total_com_frete]" readonly placeholder="R$ 0,00">
                        </div>
                    </div>
                </div>
                ${produtoIndex > 0 ? `
                    <div class="mt-3">
                        <button type="button" class="btn btn-remove-produto" onclick="removeProduto(${produtoIndex})">
                            <i class="fas fa-trash me-2"></i>Remover Produto
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        produtosContainer.insertAdjacentHTML('beforeend', produtoHtml);
        produtos.push(produtoIndex);

        // Preencher campos se produtoData fornecido
        if (produtoData) {
            console.log(`Preenchendo produto ${produtoIndex} com dados:`, produtoData);

            // Função auxiliar para tratar valores nulos
            function safeValue(value, defaultValue = '') {
                if (value === null || value === 'null' || value === undefined) {
                    return defaultValue;
                }
                return value;
            }

            document.getElementById(`sku_produto_${produtoIndex}`).value = safeValue(produtoData.sku_produto);
            document.getElementById(`nome_produto_${produtoIndex}`).value = safeValue(produtoData.nome_produto);
            document.getElementById(`volume_${produtoIndex}`).value = safeValue(produtoData.volume);
            document.getElementById(`unidade_medida_${produtoIndex}`).value = safeValue(produtoData.unidade_medida);
            document.getElementById(`preco_unitario_${produtoIndex}`).value = produtoData.preco_unitario !== undefined ? formatMoney(produtoData.preco_unitario) : '';
            document.getElementById(`valor_total_${produtoIndex}`).value = produtoData.valor_total !== undefined ? formatMoney(produtoData.valor_total) : '';
            document.getElementById(`fornecedor_${produtoIndex}`).value = safeValue(produtoData.fornecedor);
            document.getElementById(`preco_custo_${produtoIndex}`).value = produtoData.preco_custo !== undefined ? formatMoney(produtoData.preco_custo) : '';
            document.getElementById(`valor_frete_${produtoIndex}`).value = produtoData.valor_frete !== undefined ? formatMoney(produtoData.valor_frete) : '';

            // DEBUG: Campo importante
            const prazoElement = document.getElementById(`prazo_entrega_fornecedor_${produtoIndex}`);
            if (prazoElement) {
                prazoElement.value = safeValue(produtoData.prazo_entrega_fornecedor);
                console.log(`Campo prazo_entrega_fornecedor_${produtoIndex} preenchido com: "${prazoElement.value}"`);
            } else {
                console.error(`Elemento prazo_entrega_fornecedor_${produtoIndex} não encontrado!`);
            }

            document.getElementById(`valor_total_com_frete_${produtoIndex}`).value = produtoData.valor_total_com_frete !== undefined ? formatMoney(produtoData.valor_total_com_frete) : '';
        }

        // Adicionar event listeners para cálculos automáticos
        setupCalculations(produtoIndex);

        // Aplicar bloqueio de campos por fase (Melhoria 11)
        const statusAtual = document.getElementById('statusAtual').value;
        if (statusAtual === 'Criação' || statusAtual === 'Análise Comercial') {
            bloquearCamposProduto(produtoIndex);
        }
    }

    // Função para remover produto
    window.removeProduto = function (index) {
        const produtoElement = document.getElementById(`produto-${index}`);
        if (produtoElement) {
            produtoElement.remove();
            produtos = produtos.filter(p => p !== index);
        }
    }

    // Função para configurar cálculos automáticos
    function setupCalculations(index) {
        const volumeInput = document.getElementById(`volume_${index}`);
        const precoUnitarioInput = document.getElementById(`preco_unitario_${index}`);
        const valorTotalInput = document.getElementById(`valor_total_${index}`);
        const valorFreteInput = document.getElementById(`valor_frete_${index}`);
        const valorTotalComFreteInput = document.getElementById(`valor_total_com_frete_${index}`);

        function calculateTotals() {
            const volume = parseFloat(volumeInput.value) || 0;
            // CORREÇÃO: Remover pontos de milhar do preço unitário antes de trocar vírgula por ponto
            let precoUnitarioStr = precoUnitarioInput.value.replace(/[^\d,.-]/g, '');
            precoUnitarioStr = precoUnitarioStr.replace(/\./g, ''); // remove pontos de milhar
            precoUnitarioStr = precoUnitarioStr.replace(',', '.'); // troca vírgula por ponto
            const precoUnitario = parseFloat(precoUnitarioStr) || 0;
            // CORREÇÃO: Remover pontos de milhar do valor do frete também
            let valorFreteStr = valorFreteInput.value.replace(/[^\d,.-]/g, '');
            valorFreteStr = valorFreteStr.replace(/\./g, '');
            valorFreteStr = valorFreteStr.replace(',', '.');
            const valorFrete = parseFloat(valorFreteStr) || 0;

            const valorTotal = volume * precoUnitario;
            const valorTotalComFrete = valorTotal + valorFrete;

            valorTotalInput.value = formatMoney(valorTotal);
            valorTotalComFreteInput.value = formatMoney(valorTotalComFrete);
        }

        volumeInput.addEventListener('input', calculateTotals);
        precoUnitarioInput.addEventListener('input', calculateTotals);
        valorFreteInput.addEventListener('input', calculateTotals);

        // Adicionar formatação monetária aos campos
        setupMoneyInput(precoUnitarioInput);
        setupMoneyInput(valorFreteInput);
        // Adicionar formatação monetária ao campo de custo
        const precoCustoInput = document.getElementById(`preco_custo_${index}`);
        setupMoneyInput(precoCustoInput);

        // Adicionar autocompletar para produtos (Melhoria 14)
        setupProductAutocomplete(index);
    }

    // Função para configurar autocompletar de produtos (Melhoria 14)
    function setupProductAutocomplete(index) {
        const skuInput = document.getElementById(`sku_produto_${index}`);
        const nomeInput = document.getElementById(`nome_produto_${index}`);

        // Função para bloquear campo
        function bloquearCampo(input, mensagem = '') {
            input.setAttribute('readonly', true);
            input.classList.add('campo-bloqueado');
            if (mensagem) {
                input.title = mensagem;
            }
        }

        // Função para desbloquear campo
        function desbloquearCampo(input) {
            input.removeAttribute('readonly');
            input.classList.remove('campo-bloqueado');
            input.title = '';
        }

        // Função para mostrar mensagem de erro
        function mostrarErro(input, mensagem) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');

            // NÃO remover a mensagem de erro automaticamente
            // A mensagem só deve desaparecer quando o usuário digitar algo válido

            // Mostrar tooltip com erro
            input.title = mensagem;
        }

        // Função para buscar produto por código
        function buscarProdutoPorCodigo(codigo) {
            if (!codigo || codigo.trim().length < 2) {
                // Desbloquear campo nome se código foi apagado
                desbloquearCampo(nomeInput);
                return;
            }

            fetch(`/api/produtos/buscar?codigo=${encodeURIComponent(codigo)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Produto encontrado
                        nomeInput.value = data.nome;
                        nomeInput.classList.add('is-valid');
                        nomeInput.classList.remove('is-invalid');

                        // BLOQUEAR campo nome
                        bloquearCampo(nomeInput, 'Campo bloqueado - preenchido automaticamente');

                        // Remover classe de sucesso após 2 segundos
                        setTimeout(() => {
                            nomeInput.classList.remove('is-valid');
                        }, 2000);

                        console.log(`Produto encontrado por código: ${data.codigo} → ${data.nome}`);
                    } else {
                        // Produto não encontrado
                        nomeInput.value = 'Produto não encontrado';
                        nomeInput.classList.remove('is-valid');
                        mostrarErro(nomeInput, data.error || 'Produto não Encontrado');

                        // DESBLOQUEAR campo nome para permitir edição manual
                        desbloquearCampo(nomeInput);

                        // Adicionar evento para limpar mensagem quando o usuário começar a digitar
                        nomeInput.addEventListener('input', function limparMensagemErro() {
                            if (this.value !== 'Produto não encontrado') {
                                this.classList.remove('is-invalid');
                                this.removeEventListener('input', limparMensagemErro);
                            }
                        }, { once: true });

                        console.log(`Produto não encontrado para código: ${codigo}`);
                    }
                })
                .catch(error => {
                    console.error('Erro na busca por código:', error);
                    nomeInput.value = 'Erro na busca';
                    nomeInput.classList.remove('is-valid');
                    mostrarErro(nomeInput, 'Erro na busca');
                    desbloquearCampo(nomeInput);

                    // Adicionar evento para limpar mensagem quando o usuário começar a digitar
                    nomeInput.addEventListener('input', function limparMensagemErro() {
                        if (this.value !== 'Erro na busca') {
                            this.classList.remove('is-invalid');
                            this.removeEventListener('input', limparMensagemErro);
                        }
                    }, { once: true });
                });
        }

        // Função para buscar produto por nome
        function buscarProdutoPorNome(nome) {
            if (!nome || nome.trim().length < 3) {
                // Desbloquear campo código se nome foi apagado
                desbloquearCampo(skuInput);
                return;
            }

            fetch(`/api/produtos/buscar?nome=${encodeURIComponent(nome)}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Produto encontrado
                        skuInput.value = data.codigo;
                        skuInput.classList.add('is-valid');
                        skuInput.classList.remove('is-invalid');

                        // BLOQUEAR campo código
                        bloquearCampo(skuInput, 'Campo bloqueado - preenchido automaticamente');

                        // Remover classe de sucesso após 2 segundos
                        setTimeout(() => {
                            skuInput.classList.remove('is-valid');
                        }, 2000);

                        console.log(`Produto encontrado por nome: ${data.nome} → ${data.codigo}`);
                    } else {
                        // Produto não encontrado
                        skuInput.value = 'Código não encontrado';
                        skuInput.classList.remove('is-valid');
                        mostrarErro(skuInput, data.error || 'Código não Encontrado');

                        // DESBLOQUEAR campo código para permitir edição manual
                        desbloquearCampo(skuInput);

                        // Adicionar evento para limpar mensagem quando o usuário começar a digitar
                        skuInput.addEventListener('input', function limparMensagemErro() {
                            if (this.value !== 'Código não encontrado') {
                                this.classList.remove('is-invalid');
                                this.removeEventListener('input', limparMensagemErro);
                            }
                        }, { once: true });

                        console.log(`Produto não encontrado para nome: ${nome}`);
                    }
                })
                .catch(error => {
                    console.error('Erro na busca por nome:', error);
                    skuInput.value = 'Erro na busca';
                    skuInput.classList.remove('is-valid');
                    mostrarErro(skuInput, 'Erro na busca');
                    desbloquearCampo(skuInput);

                    // Adicionar evento para limpar mensagem quando o usuário começar a digitar
                    skuInput.addEventListener('input', function limparMensagemErro() {
                        if (this.value !== 'Erro na busca') {
                            this.classList.remove('is-invalid');
                            this.removeEventListener('input', limparMensagemErro);
                        }
                    }, { once: true });
                });
        }

        // Event listeners para autocompletar produtos
        let timeoutCodigo, timeoutNome;

        skuInput.addEventListener('input', function () {
            const codigo = this.value;

            // Limpar timeout anterior
            clearTimeout(timeoutCodigo);

            // Aguardar 500ms após o usuário parar de digitar
            timeoutCodigo = setTimeout(() => {
                buscarProdutoPorCodigo(codigo);
            }, 500);
        });

        nomeInput.addEventListener('input', function () {
            const nome = this.value;

            // Limpar timeout anterior
            clearTimeout(timeoutNome);

            // Aguardar 500ms após o usuário parar de digitar
            timeoutNome = setTimeout(() => {
                buscarProdutoPorNome(nome);
            }, 500);
        });

        // Event listeners para desbloquear campos quando editados
        skuInput.addEventListener('focus', function () {
            // Se o campo nome estiver bloqueado, desbloquear ao focar no código
            if (nomeInput.hasAttribute('readonly')) {
                desbloquearCampo(nomeInput);
                nomeInput.value = ''; // Limpar nome para nova busca
            }
        });

        nomeInput.addEventListener('focus', function () {
            // Se o campo código estiver bloqueado, desbloquear ao focar no nome
            if (skuInput.hasAttribute('readonly')) {
                desbloquearCampo(skuInput);
                skuInput.value = ''; // Limpar código para nova busca
            }
        });
    }

    // Função para formatar valores monetários
    function formatMoney(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }

    // Função para configurar campos monetários
    function setupMoneyInput(input) {
        // Permitir digitação livre (apenas números, vírgula, ponto)
        input.addEventListener('input', function (e) {
            // Não formata, só impede letras
            let value = e.target.value.replace(/[^\d.,-]/g, '');
            e.target.value = value;
        });

        // Só formata para moeda ao sair do campo
        input.addEventListener('blur', function (e) {
            let value = e.target.value.replace(/[^\d,.-]/g, '');
            if (value) {
                // CORREÇÃO: Remover pontos de milhar antes de trocar vírgula por ponto
                value = value.replace(/\./g, ''); // remove todos os pontos (milhar)
                value = value.replace(',', '.'); // troca vírgula por ponto decimal
                value = parseFloat(value);
                if (!isNaN(value)) {
                    e.target.value = formatMoney(value);
                }
            }
        });
    }

    // Lógica para Filial e Mesoregião (copiada e adaptada do pesquisa_form.js)
    let filiaisData = [];

    function setupFiliais() {
        const filialSelect = document.getElementById('nome_filial');
        const mesoregiaoInput = document.getElementById('mesoregiao');
        const culturaSelect = document.getElementById('cultura');

        // Preservar valores atuais antes de recarregar
        const filialAtual = filialSelect.value;
        const mesoregiaoAtual = mesoregiaoInput.value;

        // Assume que o cotacao existe e tem nome_filial e mesoregiao para edicao
        const cotacaoFilialInicial = filialSelect.dataset.initialValue; // Usar dataset para valor inicial
        const cotacaoMesoregiaoInicial = mesoregiaoInput.dataset.initialValue; // Usar dataset

        // Carregar opções de Filial e preencher Mesoregião Geográfica automaticamente
        fetch('/api/filiais')
            .then(response => response.json())
            .then(data => {
                filiaisData = data;
                filialSelect.innerHTML = '<option value="">Selecione</option>'; // Limpar antes de adicionar
                data.forEach(function (item) {
                    const option = document.createElement('option');
                    option.value = item.FILIAL;
                    option.textContent = item.FILIAL;
                    filialSelect.appendChild(option);
                });

                // Prioridade para restaurar valores: 1) Valor atual, 2) Valor inicial da edição
                if (filialAtual && filialAtual !== '') {
                    filialSelect.value = filialAtual;
                    // Restaurar mesorregião correspondente (exceto se for Regional 7)
                    if (mesoregiaoAtual !== 'REGIONAL 7 - Joaquim') {
                        const found = filiaisData.find(f => f.FILIAL === filialAtual);
                        if (found) {
                            mesoregiaoInput.value = found['MESOREGIÃO GEOGRÁFICA'];
                            // Preencher analista baseado na mesorregião restaurada
                            preencherAnalistaPorMesorregiao(found['MESOREGIÃO GEOGRÁFICA']);
                        }
                    } else {
                        // Se for Regional 7, preencher analista Joaquim
                        preencherAnalistaPorMesorregiao('REGIONAL 7 - Joaquim');
                    }
                } else if (cotacaoFilialInicial) {
                    filialSelect.value = cotacaoFilialInicial;
                    // Acionar manualmente o evento change após definir o valor
                    const changeEvent = new Event('change');
                    filialSelect.dispatchEvent(changeEvent);
                } else if (cotacaoMesoregiaoInicial) {
                    mesoregiaoInput.value = cotacaoMesoregiaoInicial;
                    // Preencher analista baseado na mesorregião inicial
                    preencherAnalistaPorMesorregiao(cotacaoMesoregiaoInicial);
                }
            });

        filialSelect.addEventListener('change', function () {
            const selected = this.value;
            const culturaSelecionada = culturaSelect ? culturaSelect.value : '';

            // Se a cultura for Soja ou Milho, não alterar a mesorregião (manter Regional 7)
            if (culturaSelecionada === 'Soja' || culturaSelect.value === 'Milho') {
                return;
            }

            const found = filiaisData.find(f => f.FILIAL === selected);
            if (found) {
                mesoregiaoInput.value = found['MESOREGIÃO GEOGRÁFICA'];
                // Preencher analista baseado na nova mesorregião
                preencherAnalistaPorMesorregiao(found['MESOREGIÃO GEOGRÁFICA']);
            } else {
                mesoregiaoInput.value = '';
                // Limpar analista se não houver mesorregião
                preencherAnalistaPorMesorregiao('');
            }
        });
    }

    // Função para configurar listener do campo cultura
    function setupCulturaListener() {
        const culturaSelect = document.getElementById('cultura');
        const mesoregiaoInput = document.getElementById('mesoregiao');
        const nomeFilialSelect = document.getElementById('nome_filial');
        const filialRequired = document.getElementById('filial_required');
        const filialHelp = document.getElementById('filial_help');

        if (culturaSelect && mesoregiaoInput) {
            culturaSelect.addEventListener('change', function () {
                const culturaSelecionada = this.value;

                // Se a cultura for Soja ou Milho, alterar mesorregião para Regional 7 - Joaquim
                if (culturaSelecionada === 'Soja' || culturaSelecionada === 'Milho') {
                    mesoregiaoInput.value = 'REGIONAL 7 - Joaquim';
                    // Manter a filial selecionada, apenas remover obrigatoriedade
                    if (nomeFilialSelect) {
                        nomeFilialSelect.removeAttribute('required');
                        nomeFilialSelect.classList.add('form-control-plaintext');
                        nomeFilialSelect.classList.remove('form-select');
                        nomeFilialSelect.style.backgroundColor = '#f8f9fa';
                    }
                    // Mostrar mensagem de ajuda e remover obrigatoriedade
                    if (filialRequired) filialRequired.style.display = 'none';
                    if (filialHelp) filialHelp.style.display = 'block';

                    // Preencher analista Joaquim para Regional 7
                    preencherAnalistaPorMesorregiao('REGIONAL 7 - Joaquim');
                } else {
                    // Para outras culturas, restaurar a mesorregião baseada na filial selecionada
                    if (nomeFilialSelect && nomeFilialSelect.value) {
                        const found = filiaisData.find(f => f.FILIAL === nomeFilialSelect.value);
                        if (found) {
                            mesoregiaoInput.value = found['MESOREGIÃO GEOGRÁFICA'];
                            // Preencher analista baseado na mesorregião restaurada
                            preencherAnalistaPorMesorregiao(found['MESOREGIÃO GEOGRÁFICA']);
                        }
                    } else {
                        // Se não houver filial selecionada, limpar analista
                        preencherAnalistaPorMesorregiao('');
                    }
                    // Restaurar campo de filial como obrigatório
                    if (nomeFilialSelect) {
                        nomeFilialSelect.setAttribute('required', 'required');
                        nomeFilialSelect.classList.remove('form-control-plaintext');
                        nomeFilialSelect.classList.add('form-select');
                        nomeFilialSelect.style.backgroundColor = '';
                    }
                    // Esconder mensagem de ajuda e restaurar obrigatoriedade
                    if (filialRequired) filialRequired.style.display = 'inline';
                    if (filialHelp) filialHelp.style.display = 'none';
                }
            });
        }
    }

    // Função para preencher analista baseado na mesorregião
    function preencherAnalistaPorMesorregiao(mesorregiao) {
        const analistaInput = document.getElementById('analista_comercial');
        if (!analistaInput) return;

        let analista = '';

        // Mapeamento de mesorregiões para analistas
        switch (mesorregiao) {
            case 'REGIONAL 7 - Joaquim':
                analista = 'Joaquim';
                break;
            case 'REGIONAL - Ana Cássia':
                analista = 'Ana Cássia';
                break;
            case 'REGIONAL - Leiliele':
                analista = 'Leiliele';
                break;
            case 'REGIONAL - Rafael':
                analista = 'Rafael';
                break;
            case 'REGIONAL - Thalles':
                analista = 'Thalles';
                break;
            default:
                analista = '';
        }

        analistaInput.value = analista;
    }

    // Event Listeners para navegação
    document.getElementById('prevButton').addEventListener('click', function () {
        if (currentStep > 1) {
            currentStep--;
            showStep(currentStep);
        }
    });

    document.getElementById('nextButton').addEventListener('click', function () {
        if (currentStep < totalSteps) {
            // Validar campos obrigatórios do passo atual
            if (!validarPassoAtual()) {
                return;
            }
            currentStep++;
            showStep(currentStep);
        } else {
            // Validar todos os campos antes de enviar o formulário
            if (!validarPassoAtual()) {
                return;
            }
            // Disparar o submit do formulário explicitamente
            document.getElementById('cotacaoForm').dispatchEvent(new Event('submit', { cancelable: true }));
        }
    });

    // Função para validar os campos do passo atual
    function validarPassoAtual() {
        const stepElement = document.getElementById(`step${currentStep}`);
        const requiredFields = stepElement.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;

        // Validação especial para o passo 1 (filial não obrigatória para Regional 7)
        if (currentStep === 1) {
            const culturaSelect = document.getElementById('cultura');
            const nomeFilialSelect = document.getElementById('nome_filial');

            // Se a cultura for Soja ou Milho, a filial não é obrigatória
            if (culturaSelect && (culturaSelect.value === 'Soja' || culturaSelect.value === 'Milho')) {
                // Remover temporariamente o required da filial para validação
                if (nomeFilialSelect) {
                    nomeFilialSelect.removeAttribute('required');
                }
            }
        }

        // Validação especial para o passo 2 (produtos)
        if (currentStep === 2) {
            const produtos = document.querySelectorAll('.produto-item');
            if (produtos.length === 0) {
                alert('É necessário adicionar pelo menos um produto.');
                return false;
            }

            for (let produto of produtos) {
                const camposObrigatorios = produto.querySelectorAll('[required]');
                for (let campo of camposObrigatorios) {
                    if (!campo.value.trim()) {
                        isValid = false;
                        campo.classList.add('is-invalid');
                        if (!firstInvalidField) {
                            firstInvalidField = campo;
                        }
                    } else {
                        campo.classList.remove('is-invalid');
                    }
                }
            }
        } else {
            // Validação padrão para outros passos
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('is-invalid');
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                } else {
                    field.classList.remove('is-invalid');
                }
            });
        }

        // Restaurar required da filial se necessário
        if (currentStep === 1) {
            const culturaSelect = document.getElementById('cultura');
            const nomeFilialSelect = document.getElementById('nome_filial');

            if (culturaSelect && nomeFilialSelect &&
                culturaSelect.value !== 'Soja' && culturaSelect.value !== 'Milho') {
                nomeFilialSelect.setAttribute('required', 'required');
            }
        }

        if (!isValid) {
            alert('Por favor, preencha todos os campos obrigatórios antes de avançar.');
            if (firstInvalidField) {
                firstInvalidField.focus();
            }
        }

        return isValid;
    }

    // Função para validar todos os campos obrigatórios antes do envio
    function validarTodosCamposObrigatorios() {
        let isValid = true;
        let firstInvalidField = null;

        // Validar campos do passo 1 (com validação especial para Regional 7)
        const step1Fields = document.getElementById('step1').querySelectorAll('[required]');
        const culturaSelect = document.getElementById('cultura');
        const nomeFilialSelect = document.getElementById('nome_filial');

        // Se a cultura for Soja ou Milho, a filial não é obrigatória
        if (culturaSelect && (culturaSelect.value === 'Soja' || culturaSelect.value === 'Milho')) {
            // Remover temporariamente o required da filial para validação
            if (nomeFilialSelect) {
                nomeFilialSelect.removeAttribute('required');
            }
        }

        // Validação específica para campos do passo 1
        step1Fields.forEach(field => {
            // Pular validação se o campo for filial e a cultura for Soja/Milho
            if (field.id === 'nome_filial' && culturaSelect &&
                (culturaSelect.value === 'Soja' || culturaSelect.value === 'Milho')) {
                return;
            }

            // Validação especial para nome_cooperado - verificar se realmente tem valor
            if (field.id === 'nome_cooperado') {
                const valor = field.value.trim();
                console.log('🔍 Validando nome_cooperado:', valor, 'Tipo:', typeof valor, 'Length:', valor.length);

                // Lista de valores inválidos que indicam erro na busca
                const valoresInvalidos = [
                    'Cooperado não encontrado',
                    'Erro na busca',
                    'undefined',
                    'null',
                    ''
                ];

                if (!valor || valoresInvalidos.includes(valor)) {
                    isValid = false;
                    field.classList.add('is-invalid');
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                    console.log('❌ nome_cooperado inválido:', valor);

                    // Mostrar mensagem de erro específica
                    const errorMsg = document.getElementById('nome_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'block';
                    }
                } else {
                    field.classList.remove('is-invalid');
                    // Ocultar mensagem de erro
                    const errorMsg = document.getElementById('nome_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                    console.log('✅ nome_cooperado válido:', valor);
                }
            } else if (field.id === 'matricula_cooperado') {
                // Validação especial para matricula_cooperado
                const valor = field.value.trim();
                const valoresInvalidos = [
                    'Matrícula não encontrada',
                    'Erro na busca',
                    'undefined',
                    'null',
                    ''
                ];

                if (!valor || valoresInvalidos.includes(valor)) {
                    isValid = false;
                    field.classList.add('is-invalid');
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                    // Mostrar mensagem de erro
                    const errorMsg = document.getElementById('matricula_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'block';
                    }
                } else {
                    field.classList.remove('is-invalid');
                    // Ocultar mensagem de erro
                    const errorMsg = document.getElementById('matricula_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                }
            } else {
                // Validação padrão para outros campos
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('is-invalid');
                    if (!firstInvalidField) {
                        firstInvalidField = field;
                    }
                } else {
                    field.classList.remove('is-invalid');
                }
            }
        });

        // Validar produtos (passo 2)
        const produtos = document.querySelectorAll('.produto-item');
        if (produtos.length === 0) {
            alert('É necessário adicionar pelo menos um produto.');
            return false;
        }

        for (let produto of produtos) {
            const camposObrigatorios = produto.querySelectorAll('[required]');
            for (let campo of camposObrigatorios) {
                if (!campo.value.trim()) {
                    isValid = false;
                    campo.classList.add('is-invalid');
                    if (!firstInvalidField) {
                        firstInvalidField = campo;
                    }
                } else {
                    campo.classList.remove('is-invalid');
                }
            }
        }

        // Validar campos do passo 3
        const step3Fields = document.getElementById('step3').querySelectorAll('[required]');
        step3Fields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('is-invalid');
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            } else {
                field.classList.remove('is-invalid');
            }
        });

        // Restaurar required da filial se necessário
        if (culturaSelect && nomeFilialSelect &&
            culturaSelect.value !== 'Soja' && culturaSelect.value !== 'Milho') {
            nomeFilialSelect.setAttribute('required', 'required');
        }

        if (!isValid) {
            alert('Por favor, preencha todos os campos obrigatórios antes de enviar o formulário.');
            if (firstInvalidField) {
                firstInvalidField.focus();
                // Mostrar o passo correto
                if (firstInvalidField.closest('#step1')) {
                    showStep(1);
                } else if (firstInvalidField.closest('#step2')) {
                    showStep(3);
                }
            }
        }

        return isValid;
    }

    // Event Listener para adicionar produto
    document.getElementById('addProdutoButton').addEventListener('click', function () {
        addProduto();
    });

    // Inicializar produtos ao editar
    console.log('Inicializando produtos...');
    console.log('window.produtosCotacao:', window.produtosCotacao);

    if (window.produtosCotacao && Array.isArray(window.produtosCotacao) && window.produtosCotacao.length > 0) {
        console.log(`Carregando ${window.produtosCotacao.length} produtos existentes...`);
        window.produtosCotacao.forEach(function (prod, index) {
            console.log(`Produto ${index + 1}:`, prod);
            addProduto(prod);
        });
    } else {
        console.log('Nenhum produto existente, criando novo...');
        addProduto(); // Adiciona o primeiro produto ao carregar (caso novo)
    }
    showStep(1); // Mostra o primeiro passo ao carregar

    // FUNCIONALIDADE DE BUSCA DINÂMICA DE COOPERADOS
    const matriculaInput = document.getElementById('matricula_cooperado');
    const nomeInput = document.getElementById('nome_cooperado');
    const loadingMatricula = document.getElementById('loading_matricula');
    const loadingNome = document.getElementById('loading_nome');
    const sugestoesNome = document.getElementById('sugestoes_nome');

    let timeoutMatricula = null;
    let timeoutNome = null;

    // Função para buscar cooperado por matrícula
    async function buscarPorMatricula(matricula) {
        if (!matricula.trim()) {
            nomeInput.value = '';
            nomeInput.readOnly = false;
            return;
        }

        try {
            if (loadingMatricula) loadingMatricula.style.display = 'block';
            nomeInput.readOnly = true;  // Use readonly ao invés de disabled para que seja enviado no FormData

            const response = await fetch(`/api/cooperados/buscar?matricula=${encodeURIComponent(matricula)}`);
            const data = await response.json();

            if (data.success) {
                nomeInput.value = data.nome;
                nomeInput.classList.add('is-valid');
                nomeInput.classList.remove('is-invalid');
                nomeInput.readOnly = true;  // Manter readonly após sucesso
                // Ocultar mensagem de erro
                const errorMsg = document.getElementById('nome_cooperado_error');
                if (errorMsg) {
                    errorMsg.style.display = 'none';
                }
            } else {
                // Preencher com mensagem de erro (comportamento original)
                nomeInput.value = 'Cooperado não encontrado';
                nomeInput.classList.add('is-invalid');
                nomeInput.classList.remove('is-valid');
                nomeInput.readOnly = false;  // Permitir edição manual
            }
        } catch (error) {
            console.error('Erro ao buscar cooperado:', error);
            // Preencher com mensagem de erro (comportamento original)
            nomeInput.value = 'Erro na busca';
            nomeInput.classList.add('is-invalid');
            nomeInput.classList.remove('is-valid');
            nomeInput.readOnly = false;  // Permitir edição manual
        } finally {
            if (loadingMatricula) loadingMatricula.style.display = 'none';
        }
    }

    // Função para buscar cooperado por nome
    async function buscarPorNome(nome) {
        if (!nome.trim()) {
            matriculaInput.value = '';
            matriculaInput.readOnly = false;
            if (sugestoesNome) sugestoesNome.style.display = 'none';
            return;
        }

        try {
            if (loadingNome) loadingNome.style.display = 'block';
            matriculaInput.readOnly = true;  // Use readonly ao invés de disabled

            const response = await fetch(`/api/cooperados/buscar?nome=${encodeURIComponent(nome)}`);
            const data = await response.json();

            if (data.success) {
                if (data.tipo_busca === 'nome' && data.resultados && data.resultados.length > 0) {
                    // Mostrar sugestões
                    mostrarSugestoes(data.resultados);
                } else {
                    // Nome exato encontrado
                    matriculaInput.value = data.matricula;
                    matriculaInput.classList.add('is-valid');
                    matriculaInput.classList.remove('is-invalid');
                    matriculaInput.readOnly = true;  // Manter readonly após sucesso
                    if (sugestoesNome) sugestoesNome.style.display = 'none';
                    // Ocultar mensagem de erro
                    const errorMsg = document.getElementById('matricula_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                }
            } else {
                // Preencher com mensagem de erro (comportamento original)
                matriculaInput.value = 'Matrícula não encontrada';
                matriculaInput.classList.add('is-invalid');
                matriculaInput.classList.remove('is-valid');
                matriculaInput.readOnly = false;  // Permitir edição manual
                if (sugestoesNome) sugestoesNome.style.display = 'none';
            }
        } catch (error) {
            console.error('Erro ao buscar cooperado:', error);
            // Preencher com mensagem de erro (comportamento original)
            matriculaInput.value = 'Erro na busca';
            matriculaInput.classList.add('is-invalid');
            matriculaInput.classList.remove('is-valid');
            matriculaInput.readOnly = false;  // Permitir edição manual
            if (sugestoesNome) sugestoesNome.style.display = 'none';
        } finally {
            if (loadingNome) loadingNome.style.display = 'none';
        }
    }

    // Função para mostrar sugestões de nomes
    function mostrarSugestoes(resultados) {
        if (!sugestoesNome) return;

        const sugestoesContainer = sugestoesNome.querySelector('.list-group');
        if (!sugestoesContainer) return;

        sugestoesContainer.innerHTML = '';

        resultados.forEach(resultado => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = resultado.nome;
            item.addEventListener('click', function (e) {
                e.preventDefault();
                nomeInput.value = resultado.nome;
                matriculaInput.value = resultado.matricula;
                nomeInput.classList.add('is-valid');
                matriculaInput.classList.add('is-valid');
                nomeInput.classList.remove('is-invalid');
                matriculaInput.classList.remove('is-invalid');
                sugestoesNome.style.display = 'none';
                matriculaInput.disabled = false;

                // Ocultar mensagens de erro
                const nomeErrorMsg = document.getElementById('nome_cooperado_error');
                const matriculaErrorMsg = document.getElementById('matricula_cooperado_error');
                if (nomeErrorMsg) nomeErrorMsg.style.display = 'none';
                if (matriculaErrorMsg) matriculaErrorMsg.style.display = 'none';
            });
            sugestoesContainer.appendChild(item);
        });

        sugestoesNome.style.display = 'block';
    }

    // Event listeners para busca por matrícula
    if (matriculaInput) {
        matriculaInput.addEventListener('input', function () {
            const matricula = this.value;

            // Limpar timeout anterior
            if (timeoutMatricula) {
                clearTimeout(timeoutMatricula);
            }

            // Limpar validações anteriores
            this.classList.remove('is-valid', 'is-invalid');
            if (nomeInput) nomeInput.classList.remove('is-valid', 'is-invalid');

            // Definir novo timeout para busca
            timeoutMatricula = setTimeout(() => {
                buscarPorMatricula(matricula);
            }, 300); // Delay de 300ms para evitar muitas requisições
        });
    }

    // Event listeners para busca por nome
    if (nomeInput) {
        nomeInput.addEventListener('input', function () {
            const nome = this.value;

            // Limpar timeout anterior
            if (timeoutNome) {
                clearTimeout(timeoutNome);
            }

            // Limpar validações anteriores
            this.classList.remove('is-valid', 'is-invalid');
            if (matriculaInput) matriculaInput.classList.remove('is-valid', 'is-invalid');

            // Ocultar sugestões se o campo estiver vazio
            if (!nome.trim()) {
                if (sugestoesNome) sugestoesNome.style.display = 'none';
                if (matriculaInput) matriculaInput.disabled = false;
            }

            // Definir novo timeout para busca
            timeoutNome = setTimeout(() => {
                buscarPorNome(nome);
            }, 300); // Delay de 300ms para evitar muitas requisições
        });
    }

    // Limpar sugestões quando clicar fora
    document.addEventListener('click', function (e) {
        if (nomeInput && sugestoesNome && !nomeInput.contains(e.target) && !sugestoesNome.contains(e.target)) {
            sugestoesNome.style.display = 'none';
        }
    });

    // Limpar campos quando a página carregar (se não houver valores)
    if (matriculaInput && !matriculaInput.value && nomeInput && !nomeInput.value) {
        matriculaInput.classList.remove('is-valid', 'is-invalid');
        nomeInput.classList.remove('is-valid', 'is-invalid');
    }

    // Substituir o submit padrão por AJAX para enviar os produtos corretamente
    document.getElementById('cotacaoForm').addEventListener('submit', function (e) {
        e.preventDefault();

        // VALIDAÇÃO EXTRA: Verificar motivo da cotação perdida
        if (document.getElementById('status').value === 'Cotação Perdida' &&
            !document.getElementById('motivo_venda_perdida').value.trim()) {
            alert('Por favor, informe o motivo da cotação perdida.');
            document.getElementById('motivo_venda_perdida').focus();
            return false;
        }

        // VALIDAÇÃO INICIAL - Verificar se há campos vazios básicos
        console.log('🔍 Iniciando validação básica...');

        // Configurar event listeners para limpar validações quando o usuário digitar
        const nomeCooperadoField = document.getElementById('nome_cooperado');
        const matriculaField = document.getElementById('matricula_cooperado');

        if (nomeCooperadoField) {
            nomeCooperadoField.addEventListener('input', function () {
                if (this.value.trim() && this.value !== 'Cooperado não encontrado' && this.value !== 'Erro na busca') {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                    const errorMsg = document.getElementById('nome_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                }
            });
        }

        if (matriculaField) {
            matriculaField.addEventListener('input', function () {
                if (this.value.trim() && this.value !== 'Matrícula não encontrada' && this.value !== 'Erro na busca') {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                    const errorMsg = document.getElementById('matricula_cooperado_error');
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                }
            });
        }

        // VALIDAÇÃO OBRIGATÓRIA ANTES DO ENVIO
        if (!validarTodosCamposObrigatorios()) {
            console.log('❌ Validação falhou, bloqueando envio');
            return false;
        }

        // Montar dados do formulário
        const form = e.target;
        const formData = new FormData(form);

        // Montar array de produtos
        const produtos = [];
        document.querySelectorAll('.produto-item').forEach(function (produtoDiv, idx) {
            const produto = {
                sku_produto: produtoDiv.querySelector(`[id^=sku_produto_]`).value,
                nome_produto: produtoDiv.querySelector(`[id^=nome_produto_]`).value,
                volume: produtoDiv.querySelector(`[id^=volume_]`).value,
                unidade_medida: produtoDiv.querySelector(`[id^=unidade_medida_]`).value,
                preco_unitario: produtoDiv.querySelector(`[id^=preco_unitario_]`).value,
                valor_total: produtoDiv.querySelector(`[id^=valor_total_]`).value,
                fornecedor: produtoDiv.querySelector(`[id^=fornecedor_]`).value,
                preco_custo: produtoDiv.querySelector(`[id^=preco_custo_]`).value,
                valor_frete: produtoDiv.querySelector(`[id^=valor_frete_]`).value,
                prazo_entrega_fornecedor: produtoDiv.querySelector(`[id^=prazo_entrega_fornecedor_]`).value,
                valor_total_com_frete: produtoDiv.querySelector(`[id^=valor_total_com_frete_]`).value
            };

            // DEBUG: Verificar campo importante
            console.log(`Produto ${idx + 1} sendo enviado:`, produto);
            console.log(`Campo prazo_entrega_fornecedor: "${produto.prazo_entrega_fornecedor}"`);
            produtos.push(produto);
        });
        formData.delete('produtos[]'); // Remover se existir
        formData.append('produtos_json', JSON.stringify(produtos));

        // Garantir que o status selecionado seja enviado corretamente
        const statusSelecionado = document.getElementById('status').value;
        formData.set('status', statusSelecionado);

        // --- NOVO TRECHO: Detectar se é edição ou criação ---
        const id = form.querySelector('input[name="id"]').value;
        let url = form.action;
        let method = form.method;
        if (id) {
            // Edição: usar POST e URL /api/cotacao/<id>, mas sinalizar PUT
            url = `/api/cotacao/${id}`;
            method = 'POST';
            formData.append('_method', 'PUT');
        }
        // --- FIM DO NOVO TRECHO ---

        // DEBUG: Verificar dados do formulário antes do envio
        console.log('🔍 Dados do formulário sendo enviados:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}:`, value);
        }

        // Verificar especificamente o campo nome_cooperado
        if (nomeCooperadoField) {
            console.log('🔍 Campo nome_cooperado:');
            console.log('  - Valor:', nomeCooperadoField.value);
            console.log('  - Tipo:', typeof nomeCooperadoField.value);
            console.log('  - Length:', nomeCooperadoField.value.length);
            console.log('  - Required:', nomeCooperadoField.hasAttribute('required'));
            console.log('  - Classes:', nomeCooperadoField.className);
        }

        // VALIDAÇÃO SIMPLIFICADA: Não fazer limpeza automática que pode causar problemas
        console.log('🔍 Valores dos campos cooperado:');
        console.log('  - nome_cooperado:', formData.get('nome_cooperado'));
        console.log('  - matricula_cooperado:', formData.get('matricula_cooperado'));

        // VALIDAÇÃO FINAL - Prosseguir com envio
        console.log('✅ Validação final concluída, prosseguindo com envio...');

        fetch(url, {
            method: method,
            body: formData
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Cotação salva com sucesso!');
                    window.location.href = '/';
                } else {
                    alert('Erro ao salvar cotação: ' + (data.error || 'Erro desconhecido.'));
                }
            })
            .catch(err => {
                alert('Erro ao enviar cotação: ' + err);
            });
    });

    // Controle do campo motivo da cotação perdida
    function toggleMotivoCotacaoPerdida() {
        const status = document.getElementById('status');
        const motivoGroup = document.getElementById('motivoVendaPerdidaGroup');
        const motivoInput = document.getElementById('motivo_venda_perdida');
        if (status && motivoGroup && motivoInput) {
            if (status.value === 'Cotação Perdida') {
                motivoGroup.style.display = '';
                motivoInput.setAttribute('required', 'required');
            } else {
                motivoGroup.style.display = 'none';
                motivoInput.removeAttribute('required');
            }
        }
    }

    // Adicionar event listener para o campo status
    const statusSelect = document.getElementById('status');
    if (statusSelect) {
        statusSelect.addEventListener('change', toggleMotivoCotacaoPerdida);
        toggleMotivoCotacaoPerdida();
    }

    // Validação extra no submit para garantir preenchimento do motivo
    // (Movida para dentro do event listener principal para evitar conflitos)

    // FUNCIONALIDADE DE BUSCA DINÂMICA DE PRODUTOS
    console.log('🚀 Inicializando busca dinâmica de produtos...');

    let timeoutCodigoProduto = {};
    let timeoutNomeProduto = {};

    // Função para buscar produto por código
    async function buscarProdutoPorCodigo(codigo, produtoIndex) {
        console.log('🔍 Buscando produto por código:', codigo, 'Index:', produtoIndex);

        if (!codigo.trim()) {
            document.getElementById(`nome_produto_${produtoIndex}`).value = '';
            document.getElementById(`nome_produto_${produtoIndex}`).disabled = false;
            return;
        }

        try {
            document.getElementById(`loading_codigo_produto_${produtoIndex}`).style.display = 'block';
            document.getElementById(`nome_produto_${produtoIndex}`).disabled = true;

            const response = await fetch(`/api/produtos/buscar?codigo=${encodeURIComponent(codigo)}`);
            const data = await response.json();

            console.log('📡 Resposta da API (código):', data);

            if (data.success) {
                document.getElementById(`nome_produto_${produtoIndex}`).value = data.nome;
                document.getElementById(`nome_produto_${produtoIndex}`).classList.add('is-valid');
                document.getElementById(`nome_produto_${produtoIndex}`).classList.remove('is-invalid');
                console.log('✅ Produto encontrado:', data.nome);
            } else {
                document.getElementById(`nome_produto_${produtoIndex}`).value = 'Produto não encontrado';
                document.getElementById(`nome_produto_${produtoIndex}`).classList.add('is-invalid');
                document.getElementById(`nome_produto_${produtoIndex}`).classList.remove('is-valid');
                console.log('❌ Produto não encontrado');
            }
        } catch (error) {
            console.error('🚨 Erro ao buscar produto por código:', error);
            document.getElementById(`nome_produto_${produtoIndex}`).value = 'Erro na busca';
            document.getElementById(`nome_produto_${produtoIndex}`).classList.add('is-invalid');
            document.getElementById(`nome_produto_${produtoIndex}`).classList.remove('is-valid');
        } finally {
            document.getElementById(`loading_codigo_produto_${produtoIndex}`).style.display = 'none';
        }
    }

    // Função para buscar produto por nome
    async function buscarProdutoPorNome(nome, produtoIndex) {
        console.log('🔍 Buscando produto por nome:', nome, 'Index:', produtoIndex);

        if (!nome.trim()) {
            document.getElementById(`sku_produto_${produtoIndex}`).value = '';
            document.getElementById(`sku_produto_${produtoIndex}`).disabled = false;
            document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
            return;
        }

        try {
            document.getElementById(`loading_nome_produto_${produtoIndex}`).style.display = 'block';
            document.getElementById(`sku_produto_${produtoIndex}`).disabled = true;

            const response = await fetch(`/api/produtos/buscar?nome=${encodeURIComponent(nome)}`);
            const data = await response.json();

            console.log('📡 Resposta da API (nome):', data);

            if (data.success) {
                if (data.tipo_busca === 'nome' && data.resultados && data.resultados.length > 0) {
                    // Mostrar sugestões
                    mostrarSugestoesProduto(data.resultados, produtoIndex);
                    console.log('🔍 Mostrando sugestões:', data.resultados.length);
                } else {
                    // Nome exato encontrado
                    document.getElementById(`sku_produto_${produtoIndex}`).value = data.codigo;
                    document.getElementById(`sku_produto_${produtoIndex}`).classList.add('is-valid');
                    document.getElementById(`sku_produto_${produtoIndex}`).classList.remove('is-invalid');
                    document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
                    console.log('✅ Nome exato encontrado:', data.nome);
                }
            } else {
                document.getElementById(`sku_produto_${produtoIndex}`).value = 'Código não encontrado';
                document.getElementById(`sku_produto_${produtoIndex}`).classList.add('is-invalid');
                document.getElementById(`sku_produto_${produtoIndex}`).classList.remove('is-valid');
                document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
                console.log('❌ Código não encontrado');
            }
        } catch (error) {
            console.error('🚨 Erro ao buscar produto por nome:', error);
            document.getElementById(`sku_produto_${produtoIndex}`).value = 'Erro na busca';
            document.getElementById(`sku_produto_${produtoIndex}`).classList.add('is-invalid');
            document.getElementById(`sku_produto_${produtoIndex}`).classList.remove('is-valid');
            document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
        } finally {
            document.getElementById(`loading_nome_produto_${produtoIndex}`).style.display = 'none';
        }
    }

    // Função para mostrar sugestões de produtos
    function mostrarSugestoesProduto(resultados, produtoIndex) {
        console.log('📋 Mostrando sugestões para produto:', produtoIndex, resultados);

        const sugestoesContainer = document.getElementById(`sugestoes_produto_${produtoIndex}`).querySelector('.list-group');
        sugestoesContainer.innerHTML = '';

        resultados.forEach(resultado => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'list-group-item list-group-item-action';
            item.textContent = resultado.nome;
            item.addEventListener('click', function (e) {
                e.preventDefault();
                document.getElementById(`nome_produto_${produtoIndex}`).value = resultado.nome;
                document.getElementById(`sku_produto_${produtoIndex}`).value = resultado.codigo;
                document.getElementById(`nome_produto_${produtoIndex}`).classList.add('is-valid');
                document.getElementById(`sku_produto_${produtoIndex}`).classList.add('is-valid');
                document.getElementById(`nome_produto_${produtoIndex}`).classList.remove('is-invalid');
                document.getElementById(`sku_produto_${produtoIndex}`).classList.remove('is-invalid');
                document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
                document.getElementById(`sku_produto_${produtoIndex}`).disabled = false;
                console.log('✅ Selecionado:', resultado.nome, resultado.codigo);
            });
            sugestoesContainer.appendChild(item);
        });

        document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'block';
    }

    // Função para configurar event listeners de um produto
    function configurarEventListenersProduto(produtoIndex) {
        console.log('🎯 Configurando event listeners para produto:', produtoIndex);

        const codigoInput = document.getElementById(`sku_produto_${produtoIndex}`);
        const nomeInput = document.getElementById(`nome_produto_${produtoIndex}`);

        if (!codigoInput || !nomeInput) {
            console.warn('⚠️ Campos não encontrados para produto:', produtoIndex);
            return;
        }

        // Event listener para busca por código
        codigoInput.addEventListener('input', function () {
            const codigo = this.value;
            console.log('🎯 Input código produto:', codigo, 'Index:', produtoIndex);

            // Limpar timeout anterior
            if (timeoutCodigoProduto[produtoIndex]) {
                clearTimeout(timeoutCodigoProduto[produtoIndex]);
            }

            // Limpar validações anteriores
            this.classList.remove('is-valid', 'is-invalid');
            nomeInput.classList.remove('is-valid', 'is-invalid');

            // Se o usuário digitar algo válido, limpar mensagens de erro
            if (codigo.trim() && codigo !== 'Código não encontrado' && codigo !== 'Erro na busca') {
                this.classList.remove('is-invalid');
                // NÃO adicionar is-valid automaticamente - deixar para a API decidir
            }

            // Definir novo timeout para busca
            timeoutCodigoProduto[produtoIndex] = setTimeout(() => {
                buscarProdutoPorCodigo(codigo, produtoIndex);
            }, 300);
        });

        // Event listener para busca por nome
        nomeInput.addEventListener('input', function () {
            const nome = this.value;
            console.log('🎯 Input nome produto:', nome, 'Index:', produtoIndex);

            // Limpar timeout anterior
            if (timeoutNomeProduto[produtoIndex]) {
                clearTimeout(timeoutNomeProduto[produtoIndex]);
            }

            // Limpar validações anteriores
            this.classList.remove('is-valid', 'is-invalid');
            codigoInput.classList.remove('is-valid', 'is-invalid');

            // Se o usuário digitar algo válido, limpar mensagens de erro
            if (nome.trim() && nome !== 'Produto não encontrado' && nome !== 'Erro na busca') {
                this.classList.remove('is-invalid');
                // NÃO adicionar is-valid automaticamente - deixar para a API decidir
            }

            // Ocultar sugestões se o campo estiver vazio
            if (!nome.trim()) {
                document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
                codigoInput.disabled = false;
            }

            // Definir novo timeout para busca
            timeoutNomeProduto[produtoIndex] = setTimeout(() => {
                buscarProdutoPorNome(nome, produtoIndex);
            }, 300);
        });

        // Limpar sugestões quando clicar fora
        document.addEventListener('click', function (e) {
            if (!nomeInput.contains(e.target) && !document.getElementById(`sugestoes_produto_${produtoIndex}`).contains(e.target)) {
                document.getElementById(`sugestoes_produto_${produtoIndex}`).style.display = 'none';
            }
        });
    }

    // Modificar a função addProduto para configurar os event listeners
    const originalAddProduto = addProduto;
    addProduto = function (produtoData) {
        const produtoIndex = produtos.length;
        originalAddProduto(produtoData);

        // Configurar event listeners após adicionar o produto
        setTimeout(() => {
            configurarEventListenersProduto(produtoIndex);
        }, 100);
    };

    // Configurar event listeners para produtos existentes
    produtos.forEach((produto, index) => {
        configurarEventListenersProduto(index);
    });

    console.log('✅ Busca dinâmica de produtos inicializada com sucesso!');
}); 