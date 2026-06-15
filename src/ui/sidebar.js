import { STATUS } from '../parsers/BaseParser.js';

export function renderizarSidebar(exames) {
  const listaExamesUl = document.getElementById('lista-exames');
  if (!listaExamesUl) return;

  if (!exames || exames.length === 0) {
    listaExamesUl.innerHTML = '<li class="instructions">Nenhum exame conhecido foi encontrado.</li>';
    return;
  }

  listaExamesUl.innerHTML = exames.map(exame => {
    let valorSidebar;
    if (exame.tipo === 'agrupador' || exame.tipo === 'microbiologia') {
      valorSidebar = (exame.status === STATUS.ALTERADO ? 'Alterado' : 'Normal');
    } else {
      valorSidebar = exame.value;
    }
    return `
      <li>
        <input type="checkbox" id="${exame.id}" data-exame-id="${exame.id}" ${exame.selected ? 'checked' : ''}>
        <label for="${exame.id}">${exame.label}</label>
        <span class="exame-valor ${exame.status === STATUS.ALTERADO ? 'valor-alterado' : ''}">${valorSidebar}</span>
      </li>
    `;
  }).join('');
}

export function filtrarExames(examesEncontrados, termoBusca) {
  if (!termoBusca) return examesEncontrados;
  const termoNormalizado = termoBusca.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return examesEncontrados.filter(exame => {
    const label = exame.label.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return label.includes(termoNormalizado) ||
      (exame.nomesBusca && exame.nomesBusca.some(nome =>
        nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(termoNormalizado)
      ));
  });
}
