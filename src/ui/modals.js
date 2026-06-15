const MODAL_CLASS = 'show';

export function showConfirmationModal() {
  const modal = document.getElementById('confirmation-modal-overlay');
  if (modal) modal.classList.add(MODAL_CLASS);
}

export function hideConfirmationModal() {
  const modal = document.getElementById('confirmation-modal-overlay');
  if (modal) modal.classList.remove(MODAL_CLASS);
}

export function showEvolutionModal() {
  const modal = document.getElementById('evolution-modal-overlay');
  if (modal) modal.classList.add(MODAL_CLASS);
}

export function hideEvolutionModal() {
  const modal = document.getElementById('evolution-modal-overlay');
  if (modal) modal.classList.remove(MODAL_CLASS);
}

export function showDebugModal() {
  const modal = document.getElementById('debug-modal-overlay');
  if (modal) modal.classList.add(MODAL_CLASS);
}

export function hideDebugModal() {
  const modal = document.getElementById('debug-modal-overlay');
  if (modal) modal.classList.remove(MODAL_CLASS);
}
