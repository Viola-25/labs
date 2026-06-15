import { getJson } from '../utils/storage.js';
import { showToast } from './toast.js';

const LOCAL_STORAGE_KEY = 'resultadosRecentes';

export function createElement(tag, options = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (key === 'dataset') Object.assign(el.dataset, value);
    else el[key] = value;
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

export function renderizarResultadosRecentes() {
  const listaRecentesDiv = document.getElementById('lista-recentes');
  if (!listaRecentesDiv) return;

  const resultados = getJson(LOCAL_STORAGE_KEY, []);

  if (resultados.length === 0) {
    listaRecentesDiv.innerHTML = '<p class="instructions">Nenhum resultado processado ainda.</p>';
    return;
  }

  const agrupados = resultados.reduce((acc, res) => {
    acc[res.paciente] = acc[res.paciente] || [];
    acc[res.paciente].push(res);
    return acc;
  }, {});

  listaRecentesDiv.innerHTML = '';

  const pacientesOrdenados = Object.keys(agrupados).sort((a, b) => {
    const latestA = agrupados[a].reduce((latest, current) => (current.dataCompleta > latest.dataCompleta) ? current : latest);
    const latestB = agrupados[b].reduce((latest, current) => (current.dataCompleta > latest.dataCompleta) ? current : latest);
    return latestB.dataCompleta.localeCompare(latestA.dataCompleta);
  });

  for (const paciente of pacientesOrdenados) {
    agrupados[paciente].sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));
    const accordionContent = createElement('div', { className: 'accordion-content' });
    agrupados[paciente].forEach(res => {
      const item = createElement('div', { className: 'resultado-recente-item' }, [
        createElement('span', {}, [res.resultado]),
        createElement('div', { className: 'actions' }, [
          createElement('button', {
            className: 'copy-btn-individual btn-recarregar',
            title: 'Recarregar este laudo para reanálise',
            dataset: { laudoId: res.id }
          }, ['Recarregar']),
          createElement('button', {
            className: 'copy-btn-individual',
            title: 'Copiar este resultado',
            dataset: { copyText: res.resultado }
          }, ['Copiar'])
        ])
      ]);
      accordionContent.appendChild(item);
    });
    const accordionItem = createElement('div', { className: 'accordion-item' }, [
      createElement('div', { className: 'accordion-header' }, [
        createElement('span', {}, [paciente]),
        createElement('span', {}, ['▼'])
      ]),
      accordionContent
    ]);
    listaRecentesDiv.appendChild(accordionItem);
  }
}

export function handleHistoricoClick(event, onRecarregar) {
  const header = event.target.closest('.accordion-header');
  if (header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('span:last-child');
    const isVisible = content.style.display === 'block';
    content.style.display = isVisible ? 'none' : 'block';
    icon.textContent = isVisible ? '▼' : '▲';
    return;
  }
  const copyBtn = event.target.closest('.copy-btn-individual');
  if (copyBtn && copyBtn.dataset.copyText) {
    navigator.clipboard.writeText(copyBtn.dataset.copyText)
      .then(() => showToast('Resultado copiado!'))
      .catch(() => showToast('Falha ao copiar.'));
    return;
  }
  const recarregarBtn = event.target.closest('.btn-recarregar');
  if (recarregarBtn && recarregarBtn.dataset.laudoId) {
    if (onRecarregar) onRecarregar(recarregarBtn.dataset.laudoId);
  }
}
