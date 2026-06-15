import { BaseParser, STATUS } from './BaseParser.js';
import { removerAcentos } from '../utils/text.js';

export class AfipParser extends BaseParser {
  get id() { return 'afip'; }
  get nome() { return 'AFIP (Genérico)'; }

  detect(text) {
    if (text.includes('AFIP') || text.includes('Laboratório AFIP')) return 0.9;
    return 0.1;
  }

  processar(texto, configExames) {
    const configClone = configExames.map(e => ({
      ...e,
      ...(e.subExames ? { subExames: e.subExames.map(s => ({ ...s })) } : {})
    }));
    const textoSemAcentos = removerAcentos(texto);
    const sexoPaciente = this.pegarSexoPaciente(texto);
    const blocos = this.extrairBlocosEspecializados(texto, textoSemAcentos);

    let textoPrincipal = textoSemAcentos;
    if (blocos.blocoUrina) textoPrincipal = textoPrincipal.replace(blocos.blocoUrina, '');
    if (blocos.blocoGasometriaArterial) textoPrincipal = textoPrincipal.replace(blocos.blocoGasometriaArterial, '');
    if (blocos.blocoGasometriaVenosa) textoPrincipal = textoPrincipal.replace(blocos.blocoGasometriaVenosa, '');

    const todosNomes = configClone
      .flatMap(e => e.nomesBusca || [])
      .map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    configClone.forEach(exame => {
      if (!exame.nomesBusca) return;
      const nomesAtuais = exame.nomesBusca.map(nome =>
        removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
      );
      exame.lookaheadRegexStr = todosNomes
        .filter(nome => !nomesAtuais.includes(nome))
        .join('|') + '|Leucograma';
    });

    const todosExames = configClone.map(exame => {
      if (!exame.nomesBusca) return exame;
      try {
        let textoParaAnalisar = textoPrincipal;
        if (exame.usaTextoArterial) textoParaAnalisar = blocos.blocoGasometriaArterial;
        else if (exame.usaTextoVenoso) textoParaAnalisar = blocos.blocoGasometriaVenosa;
        else if (exame.id === 'urina1') textoParaAnalisar = blocos.blocoUrina;
        if (!textoParaAnalisar) {
          return { ...exame, value: null, status: STATUS.NAO_ENCONTRADO };
        }
        return this.analisarExame(exame, textoParaAnalisar, sexoPaciente, exame.lookaheadRegexStr);
      } catch (err) {
        return { ...exame, value: null, status: STATUS.NAO_ENCONTRADO };
      }
    });

    return {
      exames: todosExames,
      sexoPaciente,
      paciente: this.pegarNomePaciente(texto),
      data: this.pegarData(texto),
      dataCompleta: this.pegarDataCompleta(texto),
      dataHoraCompleta: this.pegarDataHoraCompleta(texto)
    };
  }
}
