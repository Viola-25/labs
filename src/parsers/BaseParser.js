import { removerAcentos, isForaDoIntervalo, parseNum, limparNumero } from '../utils/text.js';

export const STATUS = {
  NAO_ENCONTRADO: 'nao_encontrado',
  ALTERADO: 'alterado',
  NORMAL: 'normal'
};

const CONSTS = {
  LOCAL_STORAGE_KEY: 'resultadosRecentes',
  STATUS,
  MODAL_CLASS: 'show',
  DARK_MODE_CLASS: 'dark-mode',
  DARK_MODE_ENABLED: 'enabled',
  DARK_MODE_DISABLED: 'disabled'
};

export { CONSTS };

export class BaseParser {
  get id() { return 'base'; }
  get nome() { return 'Genérico'; }

  detect(text) {
    return 0;
  }

  pegarData(texto) {
    const m = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
    return m ? m[1].replace(/\/\d{4}$/, '') : null;
  }

  pegarNomePaciente(texto) {
    const m = texto.match(/Paciente:\s*([^\n]+)/i);
    return m ? m[1].trim() : "Paciente Desconhecido";
  }

  pegarDataComHora(texto) {
    const dataMatch = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
    if (!dataMatch) return 'N/A';
    const data = dataMatch[1].replace(/\/\d{4}$/, '');
    const horaMatch = texto.match(/(?:Liberacao:|Coleta:)\s*[\d\/]{8,10}\s*-?\s*(\d{1,2}):(\d{2})/i);
    if (horaMatch) {
      return `${data} ${horaMatch[1]}:${horaMatch[2]}`;
    }
    return data;
  }

  pegarDataCompleta(texto) {
    const m = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
    if (!m) return null;
    const [dia, mes, ano] = m[1].split('/');
    return `${ano}-${mes}-${dia}`;
  }

  pegarDataHoraCompleta(texto) {
    const dataMatch = texto.match(/Coleta:\s*([\d\/]{8,10})/i);
    if (!dataMatch) return null;
    const [dia, mes, ano] = dataMatch[1].split('/');
    let hora = '00';
    let minuto = '00';
    const horaMatch = texto.match(/(?:Liberacao:|Coleta:)\s*[\d\/]{8,10}\s*-?\s*(\d{1,2}):(\d{2})/i);
    if (horaMatch) {
      hora = horaMatch[1].padStart(2, '0');
      minuto = horaMatch[2].padStart(2, '0');
    }
    return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
  }

  pegarSexoPaciente(texto) {
    const m = texto.match(/Sexo:\s*(Masculino|Feminino)/i);
    if (m && m[1]) {
      return m[1].toUpperCase().startsWith('M') ? 'M' : 'F';
    }
    return null;
  }

  extrairBlocoExame(textoParaAnalisar, exameConfig, todosNomesBuscaFiltrado) {
    for (const nome of exameConfig.nomesBusca) {
      const lblSemAcentos = removerAcentos(nome);
      let regexStr = lblSemAcentos.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s/g, '\\s+');
      if (exameConfig.id === 'cea') {
        regexStr = `(?:^|\\n\\s*)${regexStr}`;
      }
      if (nome.toLowerCase() === 'lactato') regexStr = 'Lactato(?! Arterial)';
      const re = new RegExp(`(^|\\n)(${regexStr}(?:\\s|\\n|\\r)*[\\s\\S]*?)(?=(?:\\n\\s*|\\s{2,})(?:${todosNomesBuscaFiltrado})|\\nLiberado por|Problema ao visualizar|$)`, "i");
      const blocoMatch = textoParaAnalisar.match(re);
      if (blocoMatch && blocoMatch[2]) return blocoMatch[2];
    }
    return null;
  }

  extrairReferenciaDoBloco(textoBloco, sexoPaciente) {
    const parseNum = (str) => parseFloat(str.replace(',', '.'));
    let match;
    const refAnchorMatch = textoBloco.match(/Valor(?:es)? de refer[êe]ncia/i);
    let textoReferencia = textoBloco;
    if (refAnchorMatch) {
      textoReferencia = textoBloco.substring(refAnchorMatch.index);
    }
    const tfgNormalRegex = /Normal\s*:\s*(?:>=|superior a|maior que)\s*([\d,.]+)/i;
    match = textoReferencia.match(tfgNormalRegex);
    if (match && match[1]) {
      return { min: parseNum(match[1]), max: Infinity };
    }
    const adultoRegex = new RegExp(
      `(?:Adulto(s)?|Acima de \\d+ anos|\\+\\s*de \\d+ anos)[\\s=:]*?` +
      `([\\d,.]+)\\s*(?:a|ate|-)\\s*([\\d,.]+)`,
      'i'
    );
    match = textoReferencia.match(adultoRegex);
    if (match && match[2] && match[3]) {
      return { min: parseNum(match[2]), max: parseNum(match[3]) };
    }
    if (sexoPaciente) {
      const mascRegex = '(?:Masculino|Homem|Homens)';
      const femRegex = '(?:Feminino|Mulher|Mulheres)';
      const sexosRegex = [sexoPaciente === 'M' ? mascRegex : femRegex, 'Adultos'];
      for (const sexoTermo of sexosRegex) {
        const sexoRegex = new RegExp(
          `${sexoTermo}[\\s:]*?` +
          `(?:` +
            `([\\d,.]+)\\s*(?:a|ate|-)\\s*([\\d,.]+)` +
            `|(?:inferior a|menor que|<)\\s*([\\d,.]+)` +
            `|(?:superior a|maior que|>)\\s*([\\d,.]+)` +
          `)`,
          'i'
        );
        match = textoReferencia.match(sexoRegex);
        if (match) {
          if (match[1] && match[2]) return { min: parseNum(match[1]), max: parseNum(match[2]) };
          if (match[3]) return { min: -Infinity, max: parseNum(match[3]) };
          if (match[4]) return { min: parseNum(match[4]), max: Infinity };
        }
      }
    }
    match = textoReferencia.match(/(?:refer[êe]ncia:?)[\s\S]{0,100}?(-?\d[\d,.]+)\s*(?:a|ate|-)\s*(-?\d[\d,.]+)/i);
    if (match && match[1] && match[2]) {
      return { min: parseNum(match[1]), max: parseNum(match[2]) };
    }
    match = textoReferencia.match(/(?:inferior a|menor que|<)\s*([\d,.]+)/i);
    if (match && match[1]) {
      return { min: -Infinity, max: parseNum(match[1]) };
    }
    match = textoReferencia.match(/(?:superior a|maior que|>|>=)\s*([\d,.]+)/i);
    if (match && match[1]) {
      return { min: parseNum(match[1]), max: Infinity };
    }
    return null;
  }

  extrairValorDoBloco(textoBloco, exameConfig, sexoPaciente) {
    const { nomesBusca, tipo, ignorarBaixo, id } = exameConfig;

    if (tipo === 'texto') {
      let valorTexto;
      if (id === 'uroc') {
        const parcialMatch = textoBloco.match(/Resultado Parcial\s+([\s\S]+)/i);
        if (parcialMatch) {
          let lines = parcialMatch[1].trim().split(/[\n\r]+/).filter(l => l.trim());
          lines = lines.filter(l => !l.toLowerCase().includes('amostra coletada'));
          const info = lines.map(l => l.replace(/[\d\/]+\s*[\d:]+/, '').trim());
          valorTexto = info.slice(-2).join('; ');
        }
      }
      if (!valorTexto) {
        let match = textoBloco.match(/Microrganismo:\s+([^\n\r]+)/i);
        valorTexto = match ? match[1] : null;
        if (!valorTexto) {
          const naoReagenteMatch = textoBloco.match(/(N[aã]o Reagente)/i);
          const reagenteMatch = textoBloco.match(/(?<!N[aã]o\s)\b(Reagente)\b/i);
          const crescimentoMatch = textoBloco.match(/(?:Resultado:|Microrganismo:)\s*(N[aã]o houve crescimento)/i);
          if (naoReagenteMatch) valorTexto = naoReagenteMatch[0];
          else if (reagenteMatch) valorTexto = reagenteMatch[0];
          else if (crescimentoMatch) valorTexto = crescimentoMatch[1];
        }
      }
      if (!valorTexto) return { ...exameConfig, value: null, status: STATUS.NAO_ENCONTRADO };
      if (id === 'hmc' && valorTexto.toLowerCase().includes('coagulase negative staphylococcus')) {
        return { ...exameConfig, value: 'Staphylo Coag Neg', status: STATUS.ALTERADO };
      }
      if (id === 'uroc' && valorTexto.toLowerCase().includes("nao houve crescimento")) {
        return { ...exameConfig, value: 'SCB', status: STATUS.NORMAL };
      }
      return { ...exameConfig, value: valorTexto.trim().replace(/\.$/, ''), status: STATUS.NORMAL };
    }

    let valorMatch = null;
    const patterns = [
      /Valor relativo\s+([\d,.-]+)/im,
      /Resultado[\s\n\r]+(Superior a\s+[\d,.-]+)/im,
      /Resultado\s+([\d,.-]+)/im,
      nomesBusca.some(n => ["neutrofilos", "linfocitos totais", "monocitos", "eosinofilos", "basofilos"].includes(n.toLowerCase())) ? /[\d,.]+\s+([\d,.]+)/ : null,
      ...nomesBusca.map(nome => new RegExp(`^${removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s+(-?\\d[\\d,.-]*)`, "im")),
      /(?:\s|\n)(-?\d[\d,.-]*)/
    ].filter(p => p);

    for (const pattern of patterns) {
      valorMatch = textoBloco.match(pattern);
      if (valorMatch && valorMatch[1]) break;
    }

    if (!valorMatch || !valorMatch[1]) return { ...exameConfig, value: null, status: STATUS.NAO_ENCONTRADO };

    const valorOriginalStr = valorMatch[1].trim();
    if (isNaN(parseFloat(valorOriginalStr.replace(',', '.')))) {
      return { ...exameConfig, value: valorOriginalStr, status: STATUS.NORMAL };
    }

    const valorStr = limparNumero(valorOriginalStr);
    const valorNum = parseFloat(valorStr);
    let status = STATUS.NORMAL;

    let referencia = this.extrairReferenciaDoBloco(textoBloco, sexoPaciente);
    let origemReferencia = 'nenhuma';

    if (referencia) {
      origemReferencia = 'dinamica';
      try {
        const cacheKey = `ref_cache_${exameConfig.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(referencia));
      } catch (e) {}
    } else if (exameConfig.ref) {
      origemReferencia = 'hardcoded';
      if (exameConfig.ref.M || exameConfig.ref.F) {
        referencia = sexoPaciente ? exameConfig.ref[sexoPaciente] : (exameConfig.ref.M || exameConfig.ref.F);
      } else {
        referencia = exameConfig.ref;
      }
    }

    if (id === 'inr' && valorNum >= 2.0 && valorNum <= 3.0) {
      status = STATUS.NORMAL;
      const inrResult = { ...exameConfig, value: valorOriginalStr, status };
      inrResult.debug = { referenciaUtilizada: referencia, origemReferencia };
      return inrResult;
    }

    if (isForaDoIntervalo(valorNum, referencia, ignorarBaixo)) {
      status = STATUS.ALTERADO;
    }

    const result = { ...exameConfig, value: valorOriginalStr, status };
    result.debug = { referenciaUtilizada: referencia, origemReferencia };
    return result;
  }

  analisarExameAgrupador(exameConfig, textoParaAnalisar, sexoPaciente) {
    const { subExames } = exameConfig;
    const resultadosSubExames = subExames.map(sub => {
      const nomeBusca = sub.nomesBusca.map(n => n.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
      const regex = new RegExp(`(?:^|[\\n\\r])\\s*(${nomeBusca})[\\s:]+([^\\n\\r<]+)`, "im");
      const match = textoParaAnalisar.match(regex);
      if (!match || !match[2]) {
        return { ...sub, value: null, status: STATUS.NAO_ENCONTRADO };
      }
      const valorStrOriginal = match[2].trim();
      const valorStrLimpo = valorStrOriginal.replace(',', '.');
      if (sub.tipo === 'texto') {
        const status = valorStrLimpo.toLowerCase() === sub.ref.normal.toLowerCase() ? STATUS.NORMAL : STATUS.ALTERADO;
        return { ...sub, value: valorStrOriginal, status };
      }
      const valorNum = parseFloat(valorStrLimpo.replace(/\.(?=.*\d{3})/g, ''));
      if (isNaN(valorNum)) {
        return { ...sub, value: valorStrOriginal, status: 'normal' };
      }
      const status = isForaDoIntervalo(valorNum, sub.ref) ? STATUS.ALTERADO : STATUS.NORMAL;
      return { ...sub, value: valorStrOriginal, status };
    });

    if (resultadosSubExames.every(r => r.status === STATUS.NAO_ENCONTRADO)) {
      return { ...exameConfig, value: null, status: STATUS.NAO_ENCONTRADO };
    }

    const alterados = resultadosSubExames.filter(sub => sub.status === 'alterado');
    const valorDisplay = alterados.length > 0
      ? alterados.map(sub => `${sub.label}: ${sub.value}`).join(', ')
      : 'Normal';

    return {
      ...exameConfig,
      value: valorDisplay,
      status: alterados.length > 0 ? STATUS.ALTERADO : STATUS.NORMAL,
      subExames: resultadosSubExames.filter(s => s.value !== null)
    };
  }

  analisarExameMicrobiologia(exameConfig, textoCompleto) {
    const { nomesBusca } = exameConfig;
    const nomesBuscaSemAcentos = nomesBusca.map(nome => removerAcentos(nome));
    const nomeBuscaRegex = new RegExp(`(?:^|\\n)(${nomesBuscaSemAcentos.join('|')})`, 'gi');
    const resultados = [];
    const textoSemAcentos = removerAcentos(textoCompleto);
    const partes = textoSemAcentos.split(nomeBuscaRegex);

    if (partes.length <= 1) {
      return { ...exameConfig, value: null, status: STATUS.NAO_ENCONTRADO };
    }

    for (let i = 1; i < partes.length; i += 2) {
      const bloco = partes[i + 1];
      if (!bloco) continue;
      const materialMatch = bloco.match(/Mater(i|la)l:\s*([^\n\r]+)/i);
      const material = materialMatch ? materialMatch[2].trim() : 'N/A';
      const microrganismoMatch = bloco.match(/Microrganismo:\s*([^\n\r]+)/i);
      if (!microrganismoMatch || removerAcentos(microrganismoMatch[1]).toLowerCase().includes('nao houve crescimento')) {
        continue;
      }
      const nomeMicrorganismo = microrganismoMatch[1].trim();
      const sensiveis = [];
      const resistentes = [];
      const antibiogramaMatch = bloco.match(/Antibiograma([\s\S]*?)(?=Notas:|Métodos utilizados:|Cultura de Aeróbios|$)/i);
      if (antibiogramaMatch && antibiogramaMatch[1]) {
        const tabelaTexto = antibiogramaMatch[1];
        const linhasRegex = /^([A-Za-z\/].*?)\s+(S|R|I)\s*$/gm;
        let linhaMatch;
        while ((linhaMatch = linhasRegex.exec(tabelaTexto)) !== null) {
          const antibiotico = linhaMatch[1].trim();
          const sensibilidade = linhaMatch[2];
          if (sensibilidade === 'S') sensiveis.push(antibiotico);
          else if (sensibilidade === 'R') resistentes.push(antibiotico);
        }
      }
      resultados.push({ nome: nomeMicrorganismo, material, sensiveis, resistentes });
    }

    if (resultados.length === 0) {
      return { ...exameConfig, value: [], status: STATUS.NORMAL };
    }

    return { ...exameConfig, value: resultados, status: STATUS.ALTERADO };
  }

  analisarExame(exameConfig, textoParaAnalisar, sexoPaciente, lookaheadRegexStr) {
    const { tipo } = exameConfig;
    if (tipo === 'microbiologia') {
      return this.analisarExameMicrobiologia(exameConfig, textoParaAnalisar);
    }
    if (tipo === 'agrupador') {
      return this.analisarExameAgrupador(exameConfig, textoParaAnalisar, sexoPaciente);
    }
    const textoBloco = this.extrairBlocoExame(textoParaAnalisar, exameConfig, lookaheadRegexStr);
    if (!textoBloco) {
      return { ...exameConfig, value: null, status: STATUS.NAO_ENCONTRADO, debug: { textoBlocoAnalisado: null } };
    }
    const result = this.extrairValorDoBloco(textoBloco, exameConfig, sexoPaciente);
    result.debug = { ...result.debug, textoBlocoAnalisado: textoBloco };
    return result;
  }

  extrairBlocosEspecializados(texto, textoSemAcentos) {
    const blocoUrina = (textoSemAcentos.match(/(Urina I|Urina tipo I|\bEAS\b)([\s\S]*?)(?=Cultura de Urina|Liberado por|$)/i) || [])[0] || "";
    const blocoGasometriaArterial = (texto.match(/Gasometria Arterial([\s\S]*?)(?=Gasometria Venosa|Liberado por|$)/i) || [])[0] || "";
    const blocoGasometriaVenosa = (texto.match(/Gasometria Venosa([\s\S]*?)(?=Gasometria Arterial|Liberado por|$)/i) || [])[0] || "";
    return { blocoUrina, blocoGasometriaArterial, blocoGasometriaVenosa };
  }

  processar(texto, configExames) {
    throw new Error('Subclasses devem implementar processar()');
  }
}
