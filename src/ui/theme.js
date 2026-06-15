const DARK_MODE_CLASS = 'dark-mode';
const DARK_MODE_ENABLED = 'enabled';
const DARK_MODE_DISABLED = 'disabled';

export function loadTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  const darkMode = localStorage.getItem('darkMode');
  if (darkMode === DARK_MODE_ENABLED) {
    document.documentElement.classList.add(DARK_MODE_CLASS);
    themeToggle.checked = true;
  }

  themeToggle.addEventListener('change', () => {
    document.documentElement.classList.toggle(DARK_MODE_CLASS);
    const status = document.documentElement.classList.contains(DARK_MODE_CLASS)
      ? DARK_MODE_ENABLED
      : DARK_MODE_DISABLED;
    localStorage.setItem('darkMode', status);
  });
}

export function isDarkMode() {
  return document.documentElement.classList.contains(DARK_MODE_CLASS);
}
