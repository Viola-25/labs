import { AfipParser } from './AfipParser.js';
import { IbccParser } from './IbccParser.js';
import { SaoCamiloParser } from './SaoCamiloParser.js';

const parsers = [
  new IbccParser(),
  new AfipParser(),
  new SaoCamiloParser()
];

export function detectParser(text) {
  let best = parsers[0];
  let bestScore = 0;
  for (const parser of parsers) {
    try {
      const score = parser.detect(text);
      if (score > bestScore) {
        bestScore = score;
        best = parser;
      }
    } catch (e) {
      continue;
    }
  }
  return { parser: best, confidence: bestScore };
}

export function getParserById(id) {
  return parsers.find(p => p.id === id) || parsers[1];
}

export function getAvailableParsers() {
  return parsers.map(p => ({ id: p.id, nome: p.nome }));
}

export { parsers };
