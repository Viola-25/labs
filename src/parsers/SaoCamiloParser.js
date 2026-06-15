import { AfipParser } from './AfipParser.js';

export class SaoCamiloParser extends AfipParser {
  get id() { return 'saocamilo'; }
  get nome() { return 'Hospital São Camilo'; }

  detect(text) {
    if (/S[aã]o\s+Camilo/i.test(text)) return 0.9;
    if (/Hospital\s+S[aã]o\s+Camilo/i.test(text)) return 0.95;
    return 0;
  }
}
