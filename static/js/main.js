// Fix: travar tamanho da logo durante navegações/cliues rápidos
document.addEventListener('DOMContentLoaded', function() {
  try {
    const img = document.querySelector('.logo-icon img');
    if (img) {
      // Garante dimensões estáticas logo no início (evita "salto" no layout)
      img.style.width = '150px';
      img.style.height = '150px';
      img.style.maxWidth = '150px';
      img.style.maxHeight = '150px';
    }
  } catch (e) {}
});
/**
 * Funções utilitárias para a aplicação de Cotações de Fertilizantes
 */

// Formatar data para exibição
function formatarData(dataString) {
    if (!dataString) return '';
    const [year, month, day] = dataString.split('-').map(Number);
    // Cria a data no fuso local, não UTC!
    const data = new Date(year, month - 1, day);
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return data.toLocaleDateString('pt-BR', options);
}

// Formatar número para exibição
function formatarNumero(numero) {
    if (numero === null || numero === undefined) return '';
    
    return parseFloat(numero).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Formatar valor monetário
function formatarMoeda(valor) {
    if (valor === null || valor === undefined) return '';
    
    return `R$ ${parseFloat(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

// Mostrar mensagem de alerta
function mostrarAlerta(mensagem, tipo = 'success', duracao = 3000) {
    // Remover alertas existentes
    $('.alert-floating').remove();
    
    // Criar novo alerta
    const alerta = $(`
        <div class="alert alert-${tipo} alert-floating shadow-sm fade show">
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        </div>
    `);
    
    // Adicionar ao corpo do documento
    $('body').append(alerta);
    
    // Remover após a duração especificada
    if (duracao > 0) {
        setTimeout(() => {
            alerta.alert('close');
        }, duracao);
    }
}

// Confirmar ação
function confirmarAcao(mensagem, callback) {
    if (confirm(mensagem)) {
        callback();
    }
}

// Adicionar estilos para alertas flutuantes
$('<style>')
    .text(`
        .alert-floating {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            max-width: 500px;
            padding: 15px 20px;
            border-left: 5px solid;
        }
        .alert-success {
            border-left-color: #28a745;
        }
        .alert-danger {
            border-left-color: #dc3545;
        }
        .alert-warning {
            border-left-color: #ffc107;
        }
        .alert-info {
            border-left-color: #17a2b8;
        }
    `)
    .appendTo('head');