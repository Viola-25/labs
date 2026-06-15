import configExames from './config/exames.js';
import { detectParser, getAvailableParsers, getParserById } from './parsers/index.js';
import { STATUS } from './parsers/BaseParser.js';
import { removerAcentos, limparNumero, parseNum, areValuesEqual } from './utils/text.js';
import { getJson, setJson } from './utils/storage.js';
import { showToast } from './ui/toast.js';
import { loadTheme } from './ui/theme.js';
import { showConfirmationModal, hideConfirmationModal, showEvolutionModal } from './ui/modals.js';
import { renderizarSidebar, filtrarExames } from './ui/sidebar.js';
import { renderizarResultadosRecentes, handleHistoricoClick, createElement } from './ui/history.js';

const LOCAL_STORAGE_KEY = 'resultadosRecentes';

const el = {
  inputArea: document.getElementById('input'),
  resultadoDiv: document.getElementById('resultado'),
  listaExamesUl: document.getElementById('lista-exames'),
  filtroExamesInput: document.getElementById('filtro-exames'),
  listaRecentesDiv: document.getElementById('lista-recentes'),
  marcarAlteradosToggle: document.getElementById('marcar-alterados-toggle'),
  btnProcessar: document.getElementById('btn-processar'),
  btnCopiarResultado: document.getElementById('btn-copiar'),
  btnLimparCampos: document.getElementById('btn-limpar-campos'),
  btnBaixarScript: document.getElementById('btn-baixar'),
  btnLimparHistorico: document.getElementById('btn-limpar-historico'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
  btnCancelDelete: document.getElementById('btn-cancel-delete'),
  btnSelecionarTodos: document.getElementById('btn-selecionar-todos'),
  btnLimparSelecao: document.getElementById('btn-limpar-selecao'),
  btnVerHistoricoCompleto: document.getElementById('btn-ver-historico-completo'),
  perfilDeteccao: document.getElementById('perfil-deteccao'),
  selectParser: document.getElementById('select-parser'),
};

let examesEncontradosGlobal = [];
let ultimoParser = null;

function atualizarSelecao(id, isSelected) {
  const exame = examesEncontradosGlobal.find(e => e.id === id);
  if (exame) {
    exame.selected = isSelected;
    gerarTextoFinal();
  }
}

function processar() {
  el.btnProcessar.disabled = true;
  el.btnProcessar.classList.add('btn-loading');
  el.btnProcessar.textContent = 'Analisando';

  const texto = el.inputArea.value;
  if (!texto.trim()) {
    showToast("A área de texto está vazia.");
    el.btnVerHistoricoCompleto.disabled = true;
    resetProcessarButton();
    return;
  }

  const textoSemAcentos = removerAcentos(texto);

  let parser;
  const selectEl = el.selectParser;
  if (selectEl && selectEl.value !== 'auto') {
    parser = getParserById(selectEl.value);
  } else {
    const detection = detectParser(texto);
    parser = detection.parser;
    if (el.perfilDeteccao) {
      el.perfilDeteccao.textContent = `Perfil detectado: ${parser.nome} (confiança: ${(detection.confidence * 100).toFixed(0)}%)`;
    }
  }

  ultimoParser = parser;

  const result = parser.processar(texto, [...configExames]);

  examesEncontradosGlobal = result.exames
    .filter(exame => exame.value !== null && exame.value !== undefined)
    .map(exame => {
      exame.selected = exame.selected !== undefined ? exame.selected : !exame.optional;
      return exame;
    });

  calcularTendenciaExames(result.paciente);
  renderizarSidebar(examesEncontradosGlobal);
  gerarTextoFinal();
  el.btnVerHistoricoCompleto.disabled = false;
  salvarNoHistorico();
  resetProcessarButton();
}

function resetProcessarButton() {
  el.btnProcessar.disabled = false;
  el.btnProcessar.classList.remove('btn-loading');
  el.btnProcessar.textContent = 'Analisar Laudo';
}

function copiarResultado() {
  const textoResultado = el.resultadoDiv.textContent;
  if (textoResultado) {
    navigator.clipboard.writeText(textoResultado)
      .then(() => showToast('Resultado copiado!'))
      .catch(() => showToast('Falha ao copiar.'));
  } else {
    showToast('Nada para copiar.');
  }
}

function limparTudo() {
  el.inputArea.value = '';
  el.listaExamesUl.innerHTML = '<li class="instructions">Analise um laudo para ver os exames aqui.</li>';
  el.resultadoDiv.textContent = '';
  el.btnVerHistoricoCompleto.disabled = true;
}

function handleConfirmDelete() {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  renderizarResultadosRecentes();
  hideConfirmationModal();
  showToast('Histórico limpo com sucesso!');
}

function selecionarTodosExames(selecionar) {
  examesEncontradosGlobal.forEach(exame => exame.selected = selecionar);
  const termoBusca = el.filtroExamesInput.value;
  if (termoBusca) {
    const filtrados = filtrarExames(examesEncontradosGlobal, termoBusca);
    renderizarSidebar(filtrados);
  } else {
    renderizarSidebar(examesEncontradosGlobal);
  }
  gerarTextoFinal();
}

function filtrarExamesUI() {
  const termoBusca = el.filtroExamesInput.value;
  const filtrados = filtrarExames(examesEncontradosGlobal, termoBusca);
  renderizarSidebar(filtrados);
}

function handleSelecaoExame(event) {
  if (event.target.matches('input[type="checkbox"][data-exame-id]')) {
    atualizarSelecao(event.target.dataset.exameId, event.target.checked);
  }
}

function handleRecarregarLaudo(laudoId) {
  const resultados = getJson(LOCAL_STORAGE_KEY, []);
  const laudoParaRecarregar = resultados.find(r => r.id === laudoId);
  if (laudoParaRecarregar && laudoParaRecarregar.originalInput) {
    el.inputArea.value = laudoParaRecarregar.originalInput;
    processar();
    showToast('Laudo recarregado e analisado!');
  }
}

function calcularTendenciaExames(nomePaciente) {
  const textoAtual = el.inputArea.value;
  const resultados = getJson(LOCAL_STORAGE_KEY, []);
  const historicoPaciente = resultados
    .filter(r => r.paciente === nomePaciente && r.exames && r.originalInput !== textoAtual)
    .sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));

  if (historicoPaciente.length === 0) {
    examesEncontradosGlobal.forEach(exame => delete exame.tendencia);
    return;
  }

  examesEncontradosGlobal.forEach(exameAtual => {
    delete exameAtual.tendencia;
    const laudoAnteriorComExame = historicoPaciente.find(laudo =>
      laudo.exames && laudo.exames.some(e => e.id === exameAtual.id && e.value !== null)
    );
    if (!laudoAnteriorComExame || exameAtual.tipo === 'texto') return;
    if (exameAtual.tipo === 'agrupador' && exameAtual.id !== 'ptf') return;
    const exameAnterior = laudoAnteriorComExame.exames.find(e => e.id === exameAtual.id);
    if (!exameAnterior) return;
    if (exameAtual.id === 'ptf') {
      const ptfTendencias = {};
      for (const subExamId of ['ptf_pt', 'ptf_alb', 'ptf_glob']) {
        const subExameAtual = exameAtual.subExames?.find(sub => sub.id === subExamId);
        const subExameAnterior = exameAnterior.subExames?.find(sub => sub.id === subExamId);
        if (subExameAtual?.value && subExameAnterior?.value) {
          const vAtual = parseNum(subExameAtual.value);
          const vAnterior = parseNum(subExameAnterior.value);
          if (!isNaN(vAtual) && !isNaN(vAnterior)) {
            let icone = '=';
            if (vAtual > vAnterior) icone = '↑';
            if (vAtual < vAnterior) icone = '↓';
            if (icone !== '=') {
              ptfTendencias[subExamId] = { icone, valorAntigo: subExameAnterior.value };
            }
          }
        }
      }
      if (Object.keys(ptfTendencias).length > 0) {
        exameAtual.tendencia = ptfTendencias;
      }
      return;
    }
    const valorAtualNum = parseNum(exameAtual.value);
    const valorAntigoNum = parseNum(exameAnterior.value);
    if (isNaN(valorAtualNum) || isNaN(valorAntigoNum)) return;
    let icone = '=';
    if (valorAtualNum > valorAntigoNum) icone = '↑';
    if (valorAtualNum < valorAntigoNum) icone = '↓';
    if (icone !== '=') {
      exameAtual.tendencia = { icone, valorAntigo: exameAnterior.value };
    }
  });
}

function criarSparkline(valores) {
  if (!valores || valores.length < 2) return '';
  const numeros = valores.map(v => {
    if (v == null) return null;
    return parseNum(limparNumero(v));
  });
  const numerosValidos = numeros.filter(n => !isNaN(n));
  if (numerosValidos.length < 2) return '';
  const LARGURA = 100, ALTURA = 22, PADDING = 2;
  const max = Math.max(...numerosValidos);
  const min = Math.min(...numerosValidos);
  let range = max - min;
  if (range === 0) {
    const y = ALTURA / 2;
    return `<svg width="${LARGURA}" height="${ALTURA}" viewbox="0 0 ${LARGURA} ${ALTURA}" class="sparkline-svg"><path d="M ${PADDING} ${y} L ${LARGURA - PADDING} ${y}" class="sparkline" /></svg>`;
  }
  let pathData = '';
  let primeiroPonto = true;
  numeros.forEach((n, i) => {
    if (n === null || isNaN(n)) return;
    const x = (i / (numeros.length - 1)) * (LARGURA - PADDING * 2) + PADDING;
    const y = ALTURA - PADDING - ((n - min) / range) * (ALTURA - PADDING * 2);
    pathData += `${primeiroPonto ? 'M' : 'L'} ${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100} `;
    primeiroPonto = false;
  });
  if (!pathData) return '';
  return `<svg width="${LARGURA}" height="${ALTURA}" viewbox="0 0 ${LARGURA} ${ALTURA}" class="sparkline-svg"><path d="${pathData}" class="sparkline" /></svg>`;
}

function mostrarHistoricoCompleto() {
  if (!ultimoParser) return;
  const nomePaciente = ultimoParser.pegarNomePaciente(el.inputArea.value);
  if (!nomePaciente || nomePaciente === "Paciente Desconhecido") {
    showToast("Para ver as tendências, primeiro analise um laudo para identificar o paciente.");
    return;
  }
  const resultados = getJson(LOCAL_STORAGE_KEY, []);
  const historicoPaciente = resultados
    .filter(r => r.paciente === nomePaciente && r.exames)
    .sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));
  if (historicoPaciente.length === 0) {
    showToast(`Nenhum histórico encontrado para ${nomePaciente}.`);
    return;
  }
  const todosExamesIds = new Set(historicoPaciente.flatMap(laudo => laudo.exames.map(ex => ex.id)));
  const modalContent = document.getElementById('evolution-modal-content');
  document.getElementById('evolution-modal-title').textContent = `Histórico de Evolução: ${nomePaciente}`;
  const table = createElement('table');
  const thead = createElement('thead');
  const tbody = createElement('tbody');
  const headerRow = createElement('tr');
  headerRow.appendChild(createElement('th', {}, ['Exame']));
  historicoPaciente.forEach(laudo => {
    headerRow.appendChild(createElement('th', {}, [ultimoParser.pegarDataComHora(laudo.originalInput)]));
  });
  headerRow.appendChild(createElement('th', { style: 'text-align: center;' }, ['Tendência']));
  thead.appendChild(headerRow);
  todosExamesIds.forEach(examId => {
    const examConfig = configExames.find(e => e.id === examId);
    if (!examConfig || (examConfig.tipo === 'agrupador' && examConfig.id !== 'ptf')) return;
    const dataRow = createElement('tr');
    dataRow.appendChild(createElement('td', {}, [examConfig.label]));
    const valoresParaSparkline = [];
    historicoPaciente.forEach((laudo, index) => {
      const exameNesteLaudo = laudo.exames.find(e => e.id === examId);
      const valorAtualStr = exameNesteLaudo ? exameNesteLaudo.value : null;
      const td = createElement('td');
      if (valorAtualStr === null) {
        td.textContent = '-';
        valoresParaSparkline.push(null);
      } else if (examConfig.tipo === 'microbiologia') {
        const nomes = valorAtualStr.map(m => m.nome).join(', ');
        td.textContent = nomes || (valorAtualStr.length > 0 ? 'Cresc.' : 'SCB');
        td.title = JSON.stringify(valorAtualStr, null, 2);
        valoresParaSparkline.push(null);
      } else {
        valoresParaSparkline.push(valorAtualStr);
        const valorAtualNum = parseNum(limparNumero(valorAtualStr));
        let displayHTML = valorAtualStr;
        let icone = '', trendIs = 'neutral', iconColorClass = '';
        const laudoAnterior = historicoPaciente[index + 1];
        if (laudoAnterior) {
          const exameAnterior = laudoAnterior.exames.find(e => e.id === examId);
          if (exameAnterior && exameAnterior.value !== null) {
            const valorAnteriorNum = parseNum(limparNumero(exameAnterior.value));
            if (!isNaN(valorAtualNum) && !isNaN(valorAnteriorNum)) {
              if (valorAtualNum > valorAnteriorNum) {
                icone = '↑';
                if (examConfig.trendMeaning === 'higher_is_worse') trendIs = 'pior';
                else if (examConfig.trendMeaning === 'higher_is_better') trendIs = 'melhor';
              } else if (valorAtualNum < valorAnteriorNum) {
                icone = '↓';
                if (examConfig.trendMeaning === 'higher_is_worse') trendIs = 'melhor';
                else if (examConfig.trendMeaning === 'higher_is_better') trendIs = 'pior';
              }
            }
          }
        }
        if (exameNesteLaudo.status === STATUS.ALTERADO) {
          displayHTML = `<span class="tendencia-pior">${valorAtualStr}</span>`;
        }
        if (trendIs === 'pior') iconColorClass = 'tendencia-pior';
        else if (trendIs === 'melhor') iconColorClass = 'tendencia-melhor';
        if (icone) displayHTML += `<span class="tendencia-icone ${iconColorClass}">${icone}</span>`;
        td.innerHTML = displayHTML;
      }
      dataRow.appendChild(td);
    });
    const sparklineCell = createElement('td', { className: 'sparkline-cell' });
    sparklineCell.innerHTML = criarSparkline(valoresParaSparkline.reverse());
    dataRow.appendChild(sparklineCell);
    tbody.appendChild(dataRow);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  modalContent.innerHTML = '';
  modalContent.appendChild(table);
  showEvolutionModal();
}

function gerarTextoFinal() {
  if (!ultimoParser) return;
  const dataLaudo = ultimoParser.pegarData(el.inputArea.value);
  const marcarAlterados = el.marcarAlteradosToggle.checked;
  const mostrarTendencia = document.getElementById('comparar-historico-toggle').checked;
  const partesResultado = examesEncontradosGlobal
    .filter(exame => exame.selected)
    .map(exame => {
      let parte = exame.template(exame.value, exame);
      if (marcarAlterados && exame.status === STATUS.ALTERADO) {
        parte = parte.replace(/ \/ $/, '* / ');
      }
      if (mostrarTendencia && exame.tendencia && exame.tendencia.icone !== '=' && exame.id !== 'ptf') {
        const textoTendencia = ` (${exame.tendencia.icone} ${exame.tendencia.valorAntigo})`;
        parte = parte.replace(/(\*? \/ )$/, `${textoTendencia}$1`);
      }
      return parte;
    });
  let resultado = `>> ${dataLaudo ? dataLaudo + ': ' : ''}${partesResultado.join('')}`;
  resultado = resultado.trim().replace(/\/$/, '').trim();
  el.resultadoDiv.textContent = resultado.toUpperCase();
}

function salvarNoHistorico() {
  if (!ultimoParser) return;
  const texto = el.inputArea.value;
  const nomePaciente = ultimoParser.pegarNomePaciente(texto);
  const dataHora = ultimoParser.pegarDataHoraCompleta(texto);
  const resultadoFinal = el.resultadoDiv.textContent;
  const novosExames = examesEncontradosGlobal;
  if (!dataHora || !resultadoFinal || !texto) return;
  const resultadosRecentes = getJson(LOCAL_STORAGE_KEY, []);
  const novoResultado = {
    id: dataHora,
    paciente: nomePaciente,
    dataCompleta: dataHora,
    resultado: resultadoFinal,
    originalInput: texto,
    exames: novosExames
  };
  const existingIndex = resultadosRecentes.findIndex(laudo => laudo.id === dataHora);
  if (existingIndex > -1) {
    resultadosRecentes[existingIndex] = novoResultado;
  } else {
    resultadosRecentes.push(novoResultado);
  }
  resultadosRecentes.sort((a, b) => String(b.id).localeCompare(String(a.id)));
  setJson(LOCAL_STORAGE_KEY, resultadosRecentes.slice(0, 50));
  renderizarResultadosRecentes();
}

function baixarScript() {
  const conteudoHtml = document.documentElement.outerHTML;
  const blob = new Blob([conteudoHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'processador_laudos.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Download iniciado!');
}

function toggleTestSection() {
  const testSection = document.getElementById('test-section-wrapper');
  if (testSection) {
    testSection.style.display = testSection.style.display === 'block' ? 'none' : 'block';
  }
}

function generateStaticTestCases() {
  const staticCases = [];
  configExames.forEach(exame => {
    if (!exame.nomesBusca || exame.nomesBusca.length === 0) return;
    const nomeBusca = exame.nomesBusca[0];
    staticCases.push({
      description: `[Estático] ${exame.label}: Deve retornar 'nao_encontrado'`,
      input: `ExameNaoRelacionado 123`,
      examId: exame.id,
      expected: { value: null, status: STATUS.NAO_ENCONTRADO }
    });
    if (exame.id === 'urina1') {
      staticCases.push({
        description: `[Estático] ${exame.label}: Deve extrair Urina I normal`,
        input: `Urina I\npH 5.5\nDensidade 1020\nNitrito Negativo`,
        examId: exame.id,
        expected: { status: STATUS.NORMAL }
      });
      staticCases.push({
        description: `[Estático] ${exame.label}: Deve extrair Urina I alterada`,
        input: `Urina I\npH 8.0\nDensidade 1020\nNitrito Positivo`,
        examId: exame.id,
        expected: { status: STATUS.ALTERADO }
      });
    } else if (exame.tipo === 'texto') {
      if (exame.id === 'uroc') {
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair 'SCB' para 'não houve crescimento'`,
          input: `${nomeBusca}\nResultado: Nao houve crescimento`,
          examId: exame.id,
          expected: { value: 'SCB', status: STATUS.NORMAL }
        });
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair microrganismo`,
          input: `${nomeBusca}\nMicrorganismo: Klebsiella pneumoniae`,
          examId: exame.id,
          expected: { value: 'Klebsiella pneumoniae', status: STATUS.NORMAL }
        });
      } else if (exame.id === 'hmc') {
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair 'HMC SCB'`,
          input: `Hemocultura\nResultado: Nao houve crescimento de microrganismos.`,
          examId: exame.id,
          expected: { value: 'não houve crescimento de microrganismos.', status: STATUS.NORMAL }
        });
      }
    } else if (exame.ref) {
      const ref = exame.ref.M || exame.ref;
      if (ref.min !== -Infinity && ref.max !== Infinity) {
        const normalValue = ((ref.min + ref.max) / 2).toFixed(2);
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair valor NORMAL`,
          input: `${nomeBusca}\nResultado ${normalValue}\nValores de referência: ${ref.min} a ${ref.max}`,
          examId: exame.id,
          expected: { value: normalValue, status: STATUS.NORMAL }
        });
      }
      if (ref.max !== Infinity) {
        const highValue = (exame.id === 'inr') ? '3.50' : (ref.max + 1).toFixed(2);
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair valor ALTERADO (alto)`,
          input: `${nomeBusca}\nResultado ${highValue}\nValores de referência: ${ref.min} a ${ref.max}`,
          examId: exame.id,
          expected: { value: highValue, status: STATUS.ALTERADO }
        });
      }
      if (ref.min > 0 && ref.min !== -Infinity && !exame.ignorarBaixo) {
        const lowValue = (ref.min * 0.5).toFixed(2);
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair valor ALTERADO (baixo)`,
          input: `${nomeBusca}\nResultado ${lowValue}\nValores de referência: ${ref.min} a ${ref.max}`,
          examId: exame.id,
          expected: { value: lowValue, status: STATUS.ALTERADO }
        });
      } else if (ref.min <= 0 && ref.min !== -Infinity && !exame.ignorarBaixo) {
        const lowValue = (ref.min - 1).toFixed(2);
        staticCases.push({
          description: `[Estático] ${exame.label}: Deve extrair valor ALTERADO (baixo)`,
          input: `${nomeBusca}\nResultado ${lowValue}\nValores de referência: ${ref.min} a ${ref.max}`,
          examId: exame.id,
          expected: { value: lowValue, status: STATUS.ALTERADO }
        });
      }
    }
  });
  return staticCases;
}

function runTests() {
  const testResultsEl = document.getElementById('test-results');
  if (!testResultsEl) return;
  testResultsEl.style.display = 'block';
  testResultsEl.textContent = 'Rodando testes...\n\n';
  const staticTestCases = generateStaticTestCases();
  testResultsEl.textContent += `${staticTestCases.length} testes estáticos encontrados.\n\n`;
  let successes = 0, failures = 0;
  const parser = getParserById('afip');

  staticTestCases.forEach(test => {
    const examConfig = configExames.find(e => e.id === test.examId);
    if (!examConfig) {
      testResultsEl.textContent += `❌ FALHA: ${test.description}\n   Motivo: Configuração não encontrada.\n\n`;
      failures++;
      return;
    }
    const sexo = test.sexo || 'M';
    const result = parser.analisarExame(examConfig, removerAcentos(test.input), sexo, '');
    const valueMatch = ('value' in test.expected) ? areValuesEqual(result.value, test.expected.value) : true;
    const statusMatch = ('status' in test.expected) ? result.status === test.expected.status : true;
    if (valueMatch && statusMatch) {
      testResultsEl.textContent += `✅ SUCESSO: ${test.description}\n`;
      successes++;
    } else {
      testResultsEl.textContent += `❌ FALHA: ${test.description}\n   Esperado: ${JSON.stringify(test.expected)}\n   Recebido: ${JSON.stringify({ value: result.value, status: result.status })}\n\n`;
      failures++;
    }
  });
  testResultsEl.textContent += `\n--- Resumo ---\nTotal: ${staticTestCases.length}\nSucessos: ${successes}\nFalhas: ${failures}\n`;
}

export function init() {
  loadTheme();
  renderizarResultadosRecentes();

  const parserOptions = getAvailableParsers();
  const selectEl = el.selectParser;
  if (selectEl) {
    selectEl.innerHTML = '<option value="auto">Auto-detecção</option>' +
      parserOptions.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  }

  el.btnProcessar.addEventListener('click', processar);
  el.btnCopiarResultado.addEventListener('click', copiarResultado);
  el.btnLimparCampos.addEventListener('click', limparTudo);
  el.btnBaixarScript.addEventListener('click', baixarScript);
  el.filtroExamesInput.addEventListener('input', filtrarExamesUI);
  el.marcarAlteradosToggle.addEventListener('change', gerarTextoFinal);
  const compararHistoricoToggle = document.getElementById('comparar-historico-toggle');
  if (compararHistoricoToggle) compararHistoricoToggle.addEventListener('change', gerarTextoFinal);
  el.btnLimparHistorico.addEventListener('click', showConfirmationModal);
  el.btnConfirmDelete.addEventListener('click', handleConfirmDelete);
  el.btnCancelDelete.addEventListener('click', hideConfirmationModal);
  el.listaRecentesDiv.addEventListener('click', (e) => handleHistoricoClick(e, handleRecarregarLaudo));
  el.listaExamesUl.addEventListener('change', handleSelecaoExame);
  el.btnSelecionarTodos.addEventListener('click', () => selecionarTodosExames(true));
  el.btnLimparSelecao.addEventListener('click', () => selecionarTodosExames(false));
  el.btnVerHistoricoCompleto.addEventListener('click', mostrarHistoricoCompleto);
  document.getElementById('btn-close-evolution-modal').addEventListener('click', () => {
    document.getElementById('evolution-modal-overlay').classList.remove('show');
  });
  const btnRunTests = document.getElementById('btn-run-tests');
  if (btnRunTests) btnRunTests.addEventListener('click', runTests);
  const btnToggleTests = document.getElementById('btn-toggle-tests');
  if (btnToggleTests) btnToggleTests.addEventListener('click', toggleTestSection);

  if (el.selectParser) {
    el.selectParser.addEventListener('change', () => {
      if (examesEncontradosGlobal.length > 0) processar();
    });
  }
}
