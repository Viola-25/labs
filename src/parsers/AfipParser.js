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
    const configClone = configExames.map(e => ({ ...e }));
    const textoSemAcentos = removerAcentos(texto);
    const sexoPaciente = this.pegarSexoPaciente(texto);
    const { blocoUrina, blocoGasometriaArterial, blocoGasometriaVenosa } = this.extrairBlocosEspecializados(texto, textoSemAcentos);

    let textoPrincipal = textoSemAcentos;
    if (blocoUrina) textoPrincipal = textoPrincipal.replace(blocoUrina, '');
    if (blocoGasometriaArterial) textoPrincipal = textoPrincipal.replace(blocoGasometriaArterial, '');
    if (blocoGasometriaVenosa) textoPrincipal = textoPrincipal.replace(blocoGasometriaVenosa, '');

    const todosNomesBuscaRegexStrings = configClone
      .flatMap(e => e.nomesBusca || [])
      .map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));

    configClone.forEach(exame => {
      if (!exame.nomesBusca) return;
      const nomesBuscaAtuais = exame.nomesBusca.map(nome => removerAcentos(nome).replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
      exame.lookaheadRegexStr = todosNomesBuscaRegexStrings.filter(nome => !nomesBuscaAtuais.includes(nome)).join('|') + '|Leucograma';
    });

    const todosExames = configClone.map(exame => {
      if (!exame.nomesBusca) return exame;
      let textoParaAnalisar = textoPrincipal;
      if (exame.usaTextoArterial) textoParaAnalisar = blocoGasometriaArterial;
      else if (exame.usaTextoVenoso) textoParaAnalisar = blocoGasometriaVenosa;
      else if (exame.id === 'urina1') textoParaAnalisar = blocoUrina;
      if (!textoParaAnalisar) {
        return { ...exame, value: null, status: STATUS.NAO_ENCONTRADO };
      }
      return this.analisarExame(exame, textoParaAnalisar, sexoPaciente, exame.lookaheadRegexStr);
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
