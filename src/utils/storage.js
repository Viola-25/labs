const QUOTA_WARN_THRESHOLD = 0.85;

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
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    checkQuota();
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      pruneStorage(key);
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {}
    }
    return false;
  }
}

export function checkQuota() {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      total += (key?.length || 0) + (localStorage.getItem(key)?.length || 0);
    }
    if (total > QUOTA_WARN_THRESHOLD * 5 * 1024 * 1024) {
      console.warn('localStorage próximo do limite de cota (~5MB)');
    }
  } catch {}
}

function pruneStorage(keyToProtect) {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k !== keyToProtect) keys.push(k);
    }
    keys.sort((a, b) => {
      const aLen = localStorage.getItem(a)?.length || 0;
      const bLen = localStorage.getItem(b)?.length || 0;
      return aLen - bLen;
    });
    while (keys.length > 3) {
      localStorage.removeItem(keys.shift());
    }
  } catch {}
}

export function getArray(key) {
  const value = getJson(key, []);
  return Array.isArray(value) ? value : [];
}

export function setArray(key, value) {
  return setJson(key, Array.isArray(value) ? value : []);
}

export function safeDeepClone(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return Array.isArray(obj) ? [...obj] : { ...obj };
  }
}
