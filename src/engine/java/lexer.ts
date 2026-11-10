import type { Diagnose, Kommentar, Pos } from './ast';

export type TokenArt = 'bez' | 'wort' | 'zahl' | 'zeichen' | 'text' | 'buchstabe' | 'ende';

export interface Token {
  art: TokenArt;
  /** Bei korrigierten Schlüsselwörtern (z.B. `While`) die Kleinform. */
  text: string;
  von: number;
  bis: number;
  zeile: number;
  spalte: number;
  index: number;
}

/** Schlüsselwörter, die der Parser versteht. */
export const SUBSET_WORTE: ReadonlySet<string> = new Set([
  'import',
  'public',
  'private',
  'class',
  'extends',
  'void',
  'int',
  'boolean',
  'if',
  'else',
  'while',
  'do',
  'for',
  'return',
  'true',
  'false',
  'this',
]);

/** Übrige reservierte Wörter von Java; sie führen zu "nicht unterstützt" statt zu Folgefehlern. */
export const FREMDE_WORTE: ReadonlySet<string> = new Set([
  'abstract',
  'assert',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'const',
  'continue',
  'default',
  'double',
  'enum',
  'final',
  'finally',
  'float',
  'goto',
  'implements',
  'instanceof',
  'interface',
  'long',
  'native',
  'new',
  'null',
  'package',
  'protected',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'throw',
  'throws',
  'transient',
  'try',
  'volatile',
]);

const MEHRZEICHEN = [
  '>>>=',
  '<<=',
  '>>=',
  '>>>',
  '...',
  '->',
  '::',
  '++',
  '--',
  '&&',
  '||',
  '==',
  '!=',
  '<=',
  '>=',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
];
const EINZELZEICHEN = '(){}[];,.=<>+-*/%!&|^~?:@';

const BEZ_START = /[\p{L}_$]/u;
const BEZ_TEIL = /[\p{L}\p{N}_$]/u;

export function tokenPos(t: Token): Pos {
  return { von: t.von, bis: t.bis, zeile: t.zeile, spalte: t.spalte, endZeile: t.zeile };
}

function javacFuerGross(klein: string, original: string): string {
  if (klein === 'while' || klein === 'if' || klein === 'for') return "';' expected";
  if (klein === 'do' || klein === 'else' || klein === 'return') return 'not a statement';
  if (klein === 'true' || klein === 'false') return `cannot find symbol\n  symbol:   variable ${original}`;
  if (klein === 'int') return `cannot find symbol\n  symbol:   class ${original}`;
  if (klein === 'class' || klein === 'import') return 'class, interface, enum, or record expected';
  return '<identifier> expected';
}

export interface LexErgebnis {
  tokens: Token[];
  kommentare: Kommentar[];
  diagnosen: Diagnose[];
}

export function lex(quelltext: string): LexErgebnis {
  const tokens: Token[] = [];
  const kommentare: Kommentar[] = [];
  const diagnosen: Diagnose[] = [];
  const n = quelltext.length;
  let i = 0;
  let zeile = 1;
  let zeilenStart = 0;

  const token = (art: TokenArt, von: number, bis: number, text = quelltext.slice(von, bis)): void => {
    tokens.push({ art, text, von, bis, zeile, spalte: von - zeilenStart + 1, index: tokens.length });
  };

  while (i < n) {
    const c = quelltext[i];

    if (c === '\n') {
      i++;
      zeile++;
      zeilenStart = i;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === ' ' || c === '﻿') {
      i++;
      continue;
    }

    if (c === '/' && quelltext[i + 1] === '/') {
      const von = i;
      while (i < n && quelltext[i] !== '\n') i++;
      kommentare.push({
        art: 'zeile',
        text: quelltext.slice(von, i).replace(/\r$/, ''),
        pos: { von, bis: i, zeile, spalte: von - zeilenStart + 1, endZeile: zeile },
      });
      continue;
    }

    if (c === '/' && quelltext[i + 1] === '*') {
      const von = i;
      const startZeile = zeile;
      const spalte = von - zeilenStart + 1;
      const istDoc = quelltext[i + 2] === '*' && quelltext[i + 3] !== '/';
      i += 2;
      let geschlossen = false;
      while (i < n) {
        if (quelltext[i] === '*' && quelltext[i + 1] === '/') {
          i += 2;
          geschlossen = true;
          break;
        }
        if (quelltext[i] === '\n') {
          zeile++;
          zeilenStart = i + 1;
        }
        i++;
      }
      const pos: Pos = { von, bis: i, zeile: startZeile, spalte, endZeile: zeile };
      kommentare.push({ art: istDoc ? 'doc' : 'block', text: quelltext.slice(von, i), pos });
      if (!geschlossen) {
        diagnosen.push({
          code: 'kommentar-offen',
          schwere: 'fehler',
          pos: { von, bis: von + 2, zeile: startZeile, spalte, endZeile: startZeile },
          text: `Der Kommentar, der in Zeile ${startZeile} mit /* beginnt, wird nie mit */ beendet. Deshalb gilt alles danach als Kommentar.`,
          javac: 'unterminated comment',
          tipp: 'Schreibe zu jedem /* sofort das passende */ und fülle erst dann den Kommentar.',
        });
      }
      continue;
    }

    if (BEZ_START.test(c)) {
      const von = i;
      i++;
      while (i < n && BEZ_TEIL.test(quelltext[i])) i++;
      const text = quelltext.slice(von, i);
      if (SUBSET_WORTE.has(text) || FREMDE_WORTE.has(text)) {
        token('wort', von, i);
        continue;
      }
      const klein = text.toLowerCase();
      if (SUBSET_WORTE.has(klein)) {
        // Als Schlüsselwort weiterparsen, damit aus dem einen Tippfehler keine Kette von Folgefehlern wird.
        token('wort', von, i, klein);
        diagnosen.push({
          code: 'schluesselwort-gross',
          schwere: 'fehler',
          pos: { von, bis: i, zeile, spalte: von - zeilenStart + 1, endZeile: zeile },
          text: `Das Schlüsselwort \`${klein}\` wird in Java komplett kleingeschrieben. \`${text}\` hält Java für einen selbst gewählten Namen.`,
          javac: javacFuerGross(klein, text),
          tipp: 'Alle Schlüsselwörter (public, void, if, else, while, for, return, int, boolean …) beginnen mit einem Kleinbuchstaben. Java unterscheidet Groß- und Kleinschreibung.',
          reparatur: { von, bis: i, ersatz: klein },
        });
        continue;
      }
      token('bez', von, i);
      continue;
    }

    if (c >= '0' && c <= '9') {
      const von = i;
      while (i < n && BEZ_TEIL.test(quelltext[i])) i++;
      if (quelltext[i] === '.' && quelltext[i + 1] >= '0' && quelltext[i + 1] <= '9') {
        i++;
        while (i < n && BEZ_TEIL.test(quelltext[i])) i++;
      }
      token('zahl', von, i);
      continue;
    }

    if (c === '"' || c === "'") {
      const von = i;
      i++;
      let geschlossen = false;
      while (i < n && quelltext[i] !== '\n') {
        if (quelltext[i] === '\\' && i + 1 < n && quelltext[i + 1] !== '\n') {
          i += 2;
          continue;
        }
        if (quelltext[i] === c) {
          i++;
          geschlossen = true;
          break;
        }
        i++;
      }
      token(c === '"' ? 'text' : 'buchstabe', von, i);
      if (!geschlossen) {
        diagnosen.push({
          code: 'text-offen',
          schwere: 'fehler',
          pos: { von, bis: i, zeile, spalte: von - zeilenStart + 1, endZeile: zeile },
          text: `Das Anführungszeichen ${c} in Zeile ${zeile} wird in derselben Zeile nicht wieder geschlossen.`,
          javac: c === '"' ? 'unclosed string literal' : 'unclosed character literal',
        });
      }
      continue;
    }

    const mehr = MEHRZEICHEN.find((m) => quelltext.startsWith(m, i));
    if (mehr) {
      token('zeichen', i, i + mehr.length);
      i += mehr.length;
      continue;
    }
    if (EINZELZEICHEN.includes(c)) {
      token('zeichen', i, i + 1);
      i++;
      continue;
    }

    // Unbekanntes Zeichen: melden und überspringen, damit der Parser normal weiterarbeiten kann.
    const laenge = quelltext.codePointAt(i)! > 0xffff ? 2 : 1;
    const zeichen = quelltext.slice(i, i + laenge);
    const hex = quelltext.codePointAt(i)!.toString(16).padStart(4, '0');
    diagnosen.push({
      code: 'zeichen-unbekannt',
      schwere: 'fehler',
      pos: { von: i, bis: i + laenge, zeile, spalte: i - zeilenStart + 1, endZeile: zeile },
      text: `Das Zeichen „${zeichen}“ kommt in Java-Programmen außerhalb von Kommentaren nicht vor.`,
      javac: `illegal character: '\\u${hex}'`,
      reparatur: { von: i, bis: i + laenge, ersatz: '' },
    });
    i += laenge;
  }

  tokens.push({ art: 'ende', text: '', von: n, bis: n, zeile, spalte: n - zeilenStart + 1, index: tokens.length });
  return { tokens, kommentare, diagnosen };
}
