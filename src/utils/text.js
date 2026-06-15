export function removerAcentos(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function isForaDoIntervalo(valor, referencia, ignorarBaixo = false) {
  if (!referencia) return false;
  const { min, max } = referencia;
  return valor > max || (!ignorarBaixo && valor < min);
}

export function parseNum(str) {
  return parseFloat(String(str).replace(',', '.'));
}

export function limparNumero(str) {
  return String(str).replace(/\.(?=.*\d{3}(?:,|$))/g, '').replace(',', '.');
}

export function areValuesEqual(val1, val2) {
  if (val1 === val2) return true;
  if (val1 == null || val2 == null) return false;
  const num1 = parseNum(val1);
  const num2 = parseNum(val2);
  if (!isNaN(num1) && !isNaN(num2)) return num1 === num2;
  const normalize = (s) => removerAcentos(String(s)).trim().toLowerCase().replace(/\.$/, '');
  return normalize(val1) === normalize(val2);
}
