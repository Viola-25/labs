import configExames from './config/exames.js';
import { detectParser, getAvailableParsers, getParserById } from './parsers/index.js';
import { STATUS } from './parsers/BaseParser.js';
import { removerAcentos, limparNumero, parseNum, areValuesEqual } from './utils/text.js';
import { getJson, setJson, safeDeepClone } from './utils/storage.js';
import { showToast } from './ui/toast.js';
import { loadTheme } from './ui/theme.js';
import { showConfirmationModal, hideConfirmationModal, showEvolutionModal, showDebugModal, hideDebugModal } from './ui/modals.js';
import { renderizarSidebar, filtrarExames } from './ui/sidebar.js';
import { renderizarResultadosRecentes, handleHistoricoClick, createElement } from './ui/history.js';
import { createSession, setInput, setOutput, setProfile, setExams, buildReport } from './utils/debug.js';

const LOCAL_STORAGE_KEY = 'resultadosRecentes';

let ultimoDebug = null;
window.__ultimoDebug = ultimoDebug;

const $ = (id) => document.getElementById(id);

const el = {
  inputArea: $('input'),
  resultadoDiv: $('resultado'),
  listaExamesUl: $('lista-exames'),
  filtroExamesInput: $('filtro-exames'),
  listaRecentesDiv: $('lista-recentes'),
  marcarAlteradosToggle: $('marcar-alterados-toggle'),
  compararHistoricoToggle: $('comparar-historico-toggle'),
  btnProcessar: $('btn-processar'),
  btnCopiarResultado: $('btn-copiar'),
  btnLimparCampos: $('btn-limpar-campos'),
  btnLimparHistorico: $('btn-limpar-historico'),
  btnConfirmDelete: $('btn-confirm-delete'),
  btnCancelDelete: $('btn-cancel-delete'),
  btnSelecionarTodos: $('btn-selecionar-todos'),
  btnLimparSelecao: $('btn-limpar-selecao'),
  btnVerHistoricoCompleto: $('btn-ver-historico-completo'),
  perfilDeteccao: $('perfil-deteccao'),
  selectParser: $('select-parser'),
};

const state = {
  examesEncontrados: [],
  ultimoParser: null,
  lastInput: '',
};

function atualizarSelecao(id, isSelected) {
  const exame = state.examesEncontrados.find(e => e.id === id);
  if (exame) {
    exame.selected = isSelected;
    gerarTextoFinal();
  }
}

function resetProcessarButton() {
  el.btnProcessar.disabled = false;
  el.btnProcessar.classList.remove('btn-loading');
  el.btnProcessar.textContent = 'Analisar Laudo';
}

function setProcessarLoading() {
  el.btnProcessar.disabled = true;
  el.btnProcessar.classList.add('btn-loading');
  el.btnProcessar.textContent = 'Analisando';
}

function copiarTexto(texto) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(texto);
  }
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
  } catch {
    document.body.removeChild(ta);
    return Promise.reject();
  }
}

function gerarDebugTexto() {
  if (!ultimoDebug) {
    showToast('Execute uma análise primeiro.');
    return;
  }
  if ($('debug-report-inline')) {
    $('debug-report-inline').textContent = buildReport(ultimoDebug);
    $('debug-report-inline').style.display = 'block';
  }
  if ($('debug-output')) {
    $('debug-output').textContent = buildReport(ultimoDebug);
  }
}

function copiarDebug() {
  if (!ultimoDebug) {
    showToast('Execute uma análise primeiro.');
    return;
  }
  copiarTexto(buildReport(ultimoDebug))
    .then(() => showToast('Debug copiado!'))
    .catch(() => showToast('Falha ao copiar.'));
}

function processar() {
  const texto = el.inputArea.value;
  if (!texto.trim()) {
    showToast('A área de texto está vazia.');
    el.btnVerHistoricoCompleto.disabled = true;
    return;
  }

  setProcessarLoading();
  state.lastInput = texto;

  const session = createSession();
  setInput(session, texto);
  session.ultimoParserId = null;

  try {
    const textoSemAcentos = removerAcentos(texto);
    let parser;

    if (el.selectParser && el.selectParser.value !== 'auto') {
      parser = getParserById(el.selectParser.value);
    } else {
      const detection = detectParser(texto);
      parser = detection.parser;
      if (el.perfilDeteccao) {
        el.perfilDeteccao.textContent =
          `Perfil detectado: ${parser.nome} (confiança: ${(detection.confidence * 100).toFixed(0)}%)`;
      }
    }

    state.ultimoParser = parser;
    session.ultimoParserId = parser.id;
    setProfile(session, { id: parser.id, nome: parser.nome, estrategia: 'auto' });

    const result = parser.processar(texto, configExames);

    state.examesEncontrados = result.exames
      .filter(exame => exame.value !== null && exame.value !== undefined)
      .map(exame => ({
        ...exame,
        selected: exame.selected !== undefined ? exame.selected : !exame.optional,
      }));

    calcularTendenciaExames(result.paciente);
    renderizarSidebar(state.examesEncontrados);
    gerarTextoFinal();
    el.btnVerHistoricoCompleto.disabled = false;
    salvarNoHistorico();

    setExams(session, state.examesEncontrados);
    setOutput(session, el.resultadoDiv.textContent);
    session.resultado = 'sucesso';
  } catch (err) {
    session.resultado = 'erro';
    session.erroMensagem = err.message;
    session.erroStack = err.stack;

    ultimoDebug = session;
    window.__ultimoDebug = session;
    gerarDebugTexto();

    showToast('Erro ao processar. Abra "Painel de Diagnóstico" e clique em "Copiar Debug" para reportar.');
    state.examesEncontrados = [];
    renderizarSidebar([]);
    el.resultadoDiv.textContent = '';
  } finally {
    ultimoDebug = session;
    window.__ultimoDebug = session;
    resetProcessarButton();
  }
}

function copiarResultado() {
  const textoResultado = el.resultadoDiv.textContent;
  if (!textoResultado) {
    showToast('Nada para copiar.');
    return;
  }
  copiarTexto(textoResultado)
    .then(() => showToast('Resultado copiado!'))
    .catch(() => showToast('Falha ao copiar.'));
}

function limparTudo() {
  el.inputArea.value = '';
  state.examesEncontrados = [];
  state.ultimoParser = null;
  el.listaExamesUl.innerHTML = '<li class="empty-state">Analise um laudo para ver os exames aqui.</li>';
  el.resultadoDiv.textContent = '';
  el.btnVerHistoricoCompleto.disabled = true;
}

function handleConfirmDelete() {
  setJson(LOCAL_STORAGE_KEY, []);
  renderizarResultadosRecentes();
  hideConfirmationModal();
  showToast('Histórico limpo com sucesso!');
}

function selecionarTodosExames(selecionar) {
  state.examesEncontrados.forEach(exame => { exame.selected = selecionar; });
  const termoBusca = el.filtroExamesInput.value;
  const lista = termoBusca ? filtrarExames(state.examesEncontrados, termoBusca) : state.examesEncontrados;
  renderizarSidebar(lista);
  gerarTextoFinal();
}

function filtrarExamesUI() {
  const termoBusca = el.filtroExamesInput.value;
  renderizarSidebar(filtrarExames(state.examesEncontrados, termoBusca));
}

function handleSelecaoExame(event) {
  if (event.target.matches('input[type="checkbox"][data-exame-id]')) {
    atualizarSelecao(event.target.dataset.exameId, event.target.checked);
  }
}

function handleRecarregarLaudo(laudoId) {
  const resultados = getJson(LOCAL_STORAGE_KEY, []);
  const laudo = resultados.find(r => r.id === laudoId);
  if (laudo && laudo.originalInput) {
    el.inputArea.value = laudo.originalInput;
    processar();
    showToast('Laudo recarregado e analisado!');
  }
}

function calcularTendenciaExames(nomePaciente) {
  const resultados = getJson(LOCAL_STORAGE_KEY, []);
  const historicoPaciente = resultados
    .filter(r => r.paciente === nomePaciente && r.exames && r.originalInput !== state.lastInput)
    .sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));

  state.examesEncontrados.forEach(exame => { delete exame.tendencia; });

  if (historicoPaciente.length === 0) return;

  state.examesEncontrados.forEach(exameAtual => {
    if (exameAtual.tipo === 'texto') return;
    const laudoAnterior = historicoPaciente.find(laudo =>
      laudo.exames && laudo.exames.some(e => e.id === exameAtual.id && e.value !== null)
    );
    if (!laudoAnterior) return;

    if (exameAtual.id === 'ptf') {
      const tendencias = {};
      for (const subId of ['ptf_pt', 'ptf_alb', 'ptf_glob']) {
        const subAtual = exameAtual.subExames?.find(s => s.id === subId);
        const subAnt = laudoAnterior.exames.find(e => e.id === 'ptf')?.subExames?.find(s => s.id === subId);
        if (subAtual?.value && subAnt?.value) {
          const vAtual = parseNum(subAtual.value);
          const vAnt = parseNum(subAnt.value);
          if (!isNaN(vAtual) && !isNaN(vAnt) && vAtual !== vAnt) {
            tendencias[subId] = { icone: vAtual > vAnt ? '↑' : '↓', valorAntigo: subAnt.value };
          }
        }
      }
      if (Object.keys(tendencias).length > 0) {
        exameAtual.tendencia = tendencias;
      }
      return;
    }

    const exameAnt = laudoAnterior.exames.find(e => e.id === exameAtual.id);
    if (!exameAnt || exameAnt.value == null) return;

    const vAtual = parseNum(exameAtual.value);
    const vAnt = parseNum(exameAnt.value);
    if (isNaN(vAtual) || isNaN(vAnt) || vAtual === vAnt) return;

    exameAtual.tendencia = {
      icone: vAtual > vAnt ? '↑' : '↓',
      valorAntigo: exameAnt.value,
    };
  });
}

function criarSparkline(valores) {
  if (!valores || valores.length < 2) return '';
  const numeros = valores.map(v => {
    if (v == null) return null;
    return parseNum(limparNumero(v));
  }).filter(n => !isNaN(n));
  if (numeros.length < 2) return '';
  const LARGURA = 100, ALTURA = 22, PADDING = 2;
  const max = Math.max(...numeros);
  const min = Math.min(...numeros);
  const range = max - min;
  if (range === 0) {
    const y = ALTURA / 2;
    return `<svg width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}" class="sparkline-svg"><path d="M ${PADDING} ${y} L ${LARGURA - PADDING} ${y}" class="sparkline" /></svg>`;
  }
  let pathData = '';
  numeros.forEach((n, i) => {
    const x = (i / (numeros.length - 1)) * (LARGURA - PADDING * 2) + PADDING;
    const y = ALTURA - PADDING - ((n - min) / range) * (ALTURA - PADDING * 2);
    pathData += `${i === 0 ? 'M' : 'L'} ${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100} `;
  });
  return `<svg width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}" class="sparkline-svg"><path d="${pathData}" class="sparkline" /></svg>`;
}

function mostrarHistoricoCompleto() {
  if (!state.ultimoParser) return;
  const nomePaciente = state.ultimoParser.pegarNomePaciente(el.inputArea.value);
  if (!nomePaciente || nomePaciente === 'Paciente Desconhecido') {
    showToast('Para ver as tendências, primeiro analise um laudo para identificar o paciente.');
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

  const todosExamesIds = [...new Set(historicoPaciente.flatMap(laudo => laudo.exames.map(ex => ex.id)))];
  const modalContent = $('evolution-modal-content');
  $('evolution-modal-title').textContent = `Histórico de Evolução: ${nomePaciente}`;

  const table = createElement('table');
  const thead = createElement('thead');
  const tbody = createElement('tbody');
  const headerRow = createElement('tr');
  headerRow.appendChild(createElement('th', {}, ['Exame']));
  historicoPaciente.forEach(laudo => {
    headerRow.appendChild(createElement('th', {}, [state.ultimoParser.pegarDataComHora(laudo.originalInput)]));
  });
  headerRow.appendChild(createElement('th', { style: 'text-align:center' }, ['Tendência']));
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
        let icone = '', trendIs = 'neutral';
        const laudoAnterior = historicoPaciente[index + 1];
        if (laudoAnterior) {
          const exameAnterior = laudoAnterior.exames.find(e => e.id === examId);
          if (exameAnterior && exameAnterior.value !== null) {
            const valorAnteriorNum = parseNum(limparNumero(exameAnterior.value));
            if (!isNaN(valorAtualNum) && !isNaN(valorAnteriorNum) && valorAtualNum !== valorAnteriorNum) {
              icone = valorAtualNum > valorAnteriorNum ? '↑' : '↓';
              if (examConfig.trendMeaning === 'higher_is_worse') {
                trendIs = icone === '↑' ? 'pior' : 'melhor';
              } else if (examConfig.trendMeaning === 'higher_is_better') {
                trendIs = icone === '↑' ? 'melhor' : 'pior';
              }
            }
          }
        }
        if (exameNesteLaudo.status === STATUS.ALTERADO) {
          displayHTML = `<span class="tendencia-pior">${valorAtualStr}</span>`;
        }
        if (icone) {
          displayHTML += `<span class="tendencia-icone ${trendIs === 'pior' ? 'tendencia-pior' : trendIs === 'melhor' ? 'tendencia-melhor' : ''}">${icone}</span>`;
        }
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
  if (!state.ultimoParser) return;
  const dataLaudo = state.ultimoParser.pegarData(el.inputArea.value);
  const marcarAlterados = el.marcarAlteradosToggle.checked;
  const mostrarTendencia = el.compararHistoricoToggle.checked;

  const partesResultado = state.examesEncontrados
    .filter(exame => exame.selected)
    .map(exame => {
      let parte = exame.template(exame.value, exame);
      if (marcarAlterados && exame.status === STATUS.ALTERADO) {
        parte = parte.replace(/ \/ $/, '* / ');
      }
      if (mostrarTendencia && exame.tendencia && exame.id !== 'ptf') {
        const t = exame.tendencia;
        if (t.icone && t.valorAntigo) {
          parte = parte.replace(/(\*? \/ )$/, ` (${t.icone} ${t.valorAntigo})$1`);
        }
      }
      return parte;
    });

  let resultado = `>> ${dataLaudo ? dataLaudo + ': ' : ''}${partesResultado.join('')}`;
  resultado = resultado.trim().replace(/\/$/, '').trim();
  el.resultadoDiv.textContent = resultado.toUpperCase();
}

function salvarNoHistorico() {
  if (!state.ultimoParser) return;
  const texto = el.inputArea.value;
  const nomePaciente = state.ultimoParser.pegarNomePaciente(texto);
  const dataHora = state.ultimoParser.pegarDataHoraCompleta(texto);
  const resultadoFinal = el.resultadoDiv.textContent;
  if (!dataHora || !resultadoFinal || !texto) return;

  const resultadosRecentes = getJson(LOCAL_STORAGE_KEY, []);
  const novoResultado = {
    id: dataHora,
    paciente: nomePaciente,
    dataCompleta: dataHora,
    resultado: resultadoFinal,
    originalInput: texto,
    exames: safeDeepClone(state.examesEncontrados),
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

function generateStaticTestCases() {
  const staticCases = [];
  configExames.forEach(exame => {
    if (!exame.nomesBusca || exame.nomesBusca.length === 0) return;
    const nomeBusca = exame.nomesBusca[0];
    staticCases.push({
      description: `[Estático] ${exame.label}: Deve retornar 'nao_encontrado'`,
      input: 'ExameNaoRelacionado 123',
      examId: exame.id,
      expected: { value: null, status: STATUS.NAO_ENCONTRADO }
    });
    if (exame.id === 'urina1') {
      staticCases.push({
        description: `[Estático] ${exame.label}: Deve extrair Urina I normal`,
        input: 'Urina I\npH 5.5\nDensidade 1020\nNitrito Negativo',
        examId: exame.id,
        expected: { status: STATUS.NORMAL }
      });
      staticCases.push({
        description: `[Estático] ${exame.label}: Deve extrair Urina I alterada`,
        input: 'Urina I\npH 8.0\nDensidade 1020\nNitrito Positivo',
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
          input: 'Hemocultura\nResultado: Nao houve crescimento de microrganismos.',
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
        const highValue = exame.id === 'inr' ? '3.50' : (ref.max + 1).toFixed(2);
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
  const testResultsEl = $('test-results');
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
  if (el.selectParser) {
    el.selectParser.innerHTML =
      '<option value="auto">Auto-detecção</option>' +
      parserOptions.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
  }

  el.btnProcessar.addEventListener('click', processar);
  el.btnCopiarResultado.addEventListener('click', copiarResultado);
  el.btnLimparCampos.addEventListener('click', limparTudo);
  $('btn-baixar')?.addEventListener('click', baixarScript);
  el.filtroExamesInput.addEventListener('input', filtrarExamesUI);
  el.marcarAlteradosToggle.addEventListener('change', gerarTextoFinal);
  if (el.compararHistoricoToggle) {
    el.compararHistoricoToggle.addEventListener('change', gerarTextoFinal);
  }
  el.btnLimparHistorico.addEventListener('click', showConfirmationModal);
  el.btnConfirmDelete.addEventListener('click', handleConfirmDelete);
  el.btnCancelDelete.addEventListener('click', hideConfirmationModal);
  el.listaRecentesDiv.addEventListener('click', (e) => handleHistoricoClick(e, handleRecarregarLaudo));
  el.listaExamesUl.addEventListener('change', handleSelecaoExame);
  el.btnSelecionarTodos.addEventListener('click', () => selecionarTodosExames(true));
  el.btnLimparSelecao.addEventListener('click', () => selecionarTodosExames(false));
  el.btnVerHistoricoCompleto.addEventListener('click', mostrarHistoricoCompleto);

  $('btn-close-evolution-modal')?.addEventListener('click', () => {
    $('evolution-modal-overlay')?.classList.remove('show');
  });
  $('btn-close-debug-modal')?.addEventListener('click', () => {
    $('debug-modal-overlay')?.classList.remove('show');
  });

  if (el.selectParser) {
    el.selectParser.addEventListener('change', () => {
      if (state.examesEncontrados.length > 0) processar();
    });
  }

  ['confirmation-modal-overlay', 'evolution-modal-overlay', 'debug-modal-overlay'].forEach(id => {
    $(id)?.addEventListener('click', (e) => {
      if (e.target === $(id)) $(id).classList.remove('show');
    });
  });

  $('btn-run-tests')?.addEventListener('click', runTests);
  $('btn-refresh-debug')?.addEventListener('click', gerarDebugTexto);
  $('btn-copy-debug')?.addEventListener('click', copiarDebug);
  $('btn-copy-debug-inline')?.addEventListener('click', copiarDebug);
  $('btn-open-debug-modal')?.addEventListener('click', () => {
    gerarDebugTexto();
    showDebugModal();
  });
}
