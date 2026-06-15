export function getJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function getArray(key) {
  const value = getJson(key, []);
  return Array.isArray(value) ? value : [];
}

export function setArray(key, value) {
  return setJson(key, Array.isArray(value) ? value : []);
}
