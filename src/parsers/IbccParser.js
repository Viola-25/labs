import { AfipParser } from './AfipParser.js';

export class IbccParser extends AfipParser {
  get id() { return 'ibcc'; }
  get nome() { return 'Hospital IBCC (Mooca)'; }

  detect(text) {
    if (/Hospital\s+IBCC/i.test(text)) return 0.95;
    if (/www\.shift\.com\.br/i.test(text)) return 0.9;
    if (/Navegadores\s+compativeis/i.test(text)) return 0.7;
    if (/Fonte\s+pagadora:\s*Hospital\s+IBCC/i.test(text)) return 0.95;
    if (/Unidade de coleta.*\(MO\)/i.test(text)) return 0.85;
    return 0;
  }

  pegarData(texto) {
    const m = texto.match(/Coletado\s+em\s*:\s*([\d\/]{8,10})/i);
    return m ? m[1].replace(/\/\d{4}$/, '') : super.pegarData(texto);
  }

  pegarDataComHora(texto) {
    const dataMatch = texto.match(/Coletado\s+em\s*:\s*([\d\/]{8,10})/i);
    if (!dataMatch) return super.pegarDataComHora(texto);
    const data = dataMatch[1].replace(/\/\d{4}$/, '');
    const horaMatch = texto.match(/Coletado\s+em\s*:\s*[\d\/]{8,10}\s*-\s*(\d{1,2}):(\d{2})/i);
    return horaMatch ? `${data} ${horaMatch[1]}:${horaMatch[2]}` : data;
  }

  pegarDataCompleta(texto) {
    const m = texto.match(/Coletado\s+em\s*:\s*([\d\/]{8,10})/i);
    if (!m) return super.pegarDataCompleta(texto);
    const [dia, mes, ano] = m[1].split('/');
    return `${ano}-${mes}-${dia}`;
  }

  pegarDataHoraCompleta(texto) {
    const dataMatch = texto.match(/Coletado\s+em\s*:\s*([\d\/]{8,10})/i);
    if (!dataMatch) return super.pegarDataHoraCompleta(texto);
    const [dia, mes, ano] = dataMatch[1].split('/');
    let hora = '00', minuto = '00';
    const horaMatch = texto.match(/Coletado\s+em\s*:\s*[\d\/]{8,10}\s*-\s*(\d{1,2}):(\d{2})/i);
    if (horaMatch) {
      hora = horaMatch[1].padStart(2, '0');
      minuto = horaMatch[2].padStart(2, '0');
    }
    return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  }
}
