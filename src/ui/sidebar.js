import { STATUS } from '../parsers/BaseParser.js';

export function renderizarSidebar(exames) {
  const container = document.getElementById('lista-exames');
  if (!container) return;

  if (!exames || exames.length === 0) {
    container.innerHTML = '<li class="empty-state">Nenhum exame conhecido foi encontrado.</li>';
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const exame of exames) {
    const valor = exame.tipo === 'agrupador' || exame.tipo === 'microbiologia'
      ? (exame.status === STATUS.ALTERADO ? 'Alterado' : 'Normal')
      : exame.value;
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="checkbox" id="${exame.id}" data-exame-id="${exame.id}" ${exame.selected ? 'checked' : ''}>
      <label for="${exame.id}">${exame.label}</label>
      <span class="exam-value ${exame.status === STATUS.ALTERADO ? 'alterado' : ''}">${valor}</span>
    `;
    fragment.appendChild(li);
  }
  container.innerHTML = '';
  container.appendChild(fragment);
}

export function filtrarExames(examesEncontrados, termoBusca) {
  if (!termoBusca) return examesEncontrados;
  const termo = termoBusca.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return examesEncontrados.filter(exame => {
    const label = exame.label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (label.includes(termo)) return true;
    return exame.nomesBusca?.some(nome =>
      nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(termo)
    );
  });
}
