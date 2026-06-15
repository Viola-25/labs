import { getJson } from '../utils/storage.js';
import { showToast } from './toast.js';

const LOCAL_STORAGE_KEY = 'resultadosRecentes';

export function createElement(tag, options = {}, children = []) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(options)) {
    if (key === 'dataset') Object.assign(el.dataset, value);
    else el[key] = value;
  }
  for (const child of children) {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  }
  return el;
}

export function renderizarResultadosRecentes() {
  const container = document.getElementById('lista-recentes');
  if (!container) return;

  const resultados = getJson(LOCAL_STORAGE_KEY, []);
  if (resultados.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhum resultado processado ainda.</p>';
    return;
  }

  const agrupados = {};
  for (const res of resultados) {
    (agrupados[res.paciente] ??= []).push(res);
  }

  const fragment = document.createDocumentFragment();
  const pacientesOrdenados = Object.keys(agrupados).sort((a, b) => {
    const latestA = agrupados[a].reduce((latest, current) =>
      current.dataCompleta > latest.dataCompleta ? current : latest
    );
    const latestB = agrupados[b].reduce((latest, current) =>
      current.dataCompleta > latest.dataCompleta ? current : latest
    );
    return latestB.dataCompleta.localeCompare(latestA.dataCompleta);
  });

  for (const paciente of pacientesOrdenados) {
    agrupados[paciente].sort((a, b) => b.dataCompleta.localeCompare(a.dataCompleta));
    const contentDiv = createElement('div', { className: 'accordion-content' });
    for (const res of agrupados[paciente]) {
      const item = createElement('div', { className: 'result-item' }, [
        createElement('span', {}, [res.resultado]),
        createElement('div', { className: 'actions' }, [
          createElement('button', {
            className: 'btn-recarregar',
            title: 'Recarregar este laudo para reanálise',
            dataset: { laudoId: res.id },
          }, ['Recarregar']),
          createElement('button', {
            className: 'copy-btn-individual',
            title: 'Copiar este resultado',
            dataset: { copyText: res.resultado },
          }, ['Copiar']),
        ]),
      ]);
      contentDiv.appendChild(item);
    }
    const accordion = createElement('div', { className: 'accordion-item' }, [
      createElement('div', { className: 'accordion-header' }, [
        createElement('span', {}, [paciente]),
        createElement('span', {}, ['▼']),
      ]),
      contentDiv,
    ]);
    fragment.appendChild(accordion);
  }

  container.innerHTML = '';
  container.appendChild(fragment);
}

export function handleHistoricoClick(event, onRecarregar) {
  const header = event.target.closest('.accordion-header');
  if (header) {
    const content = header.nextElementSibling;
    const icon = header.querySelector('span:last-child');
    const isOpen = content?.classList.toggle('open');
    if (icon) icon.textContent = isOpen ? '▲' : '▼';
    return;
  }

  const copyBtn = event.target.closest('.copy-btn-individual');
  if (copyBtn?.dataset.copyText) {
    navigator.clipboard.writeText(copyBtn.dataset.copyText)
      .then(() => showToast('Resultado copiado!'))
      .catch(() => showToast('Falha ao copiar.'));
    return;
  }

  const recarregarBtn = event.target.closest('.btn-recarregar');
  if (recarregarBtn?.dataset.laudoId && onRecarregar) {
    onRecarregar(recarregarBtn.dataset.laudoId);
  }
}
