// Logische Ausdrücke: Parser, Auswertung und Darstellung.
// Präzedenz wie im Unterricht: 0. Klammerung, 1. Negation, 2. Konjunktion (UND), 3. Disjunktion (ODER).

export type Notation = 'java' | 'mathe';

export type LKnoten =
  | { art: 'var'; id: number; name: string }
  | { art: 'konst'; id: number; wert: boolean }
  | { art: 'nicht'; id: number; arg: LKnoten }
  | { art: 'und' | 'oder' | 'xor'; id: number; links: LKnoten; rechts: LKnoten }
  | { art: 'klammer'; id: number; innen: LKnoten };

export type Belegung = Record<string, boolean>;

export class LogikFehler extends Error {}

type TokenArt = 'bez' | 'konst' | 'nicht' | 'und' | 'oder' | 'xor' | 'auf' | 'zu';
interface Token {
  art: TokenArt;
  text: string;
  pos: number;
}

const WORTE: Record<string, { art: TokenArt; text: string }> = {
  UND: { art: 'und', text: '&&' },
  ODER: { art: 'oder', text: '||' },
  NICHT: { art: 'nicht', text: '!' },
  XOR: { art: 'xor', text: '^' },
  true: { art: 'konst', text: 'true' },
  wahr: { art: 'konst', text: 'true' },
  false: { art: 'konst', text: 'false' },
  falsch: { art: 'konst', text: 'false' },
};

const ZEICHEN: [string, TokenArt][] = [
  ['&&', 'und'],
  ['||', 'oder'],
  ['∧', 'und'],
  ['∨', 'oder'],
  ['!', 'nicht'],
  ['¬', 'nicht'],
  ['^', 'xor'],
  ['⊕', 'xor'],
  ['(', 'auf'],
  [')', 'zu'],
];

function tokenisiere(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  aussen: while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    for (const [zeichen, art] of ZEICHEN) {
      if (text.startsWith(zeichen, i)) {
        tokens.push({ art, text: zeichen, pos: i });
        i += zeichen.length;
        continue aussen;
      }
    }
    if (c === '0' || c === '1') {
      tokens.push({ art: 'konst', text: c === '1' ? 'true' : 'false', pos: i });
      i++;
      continue;
    }
    const wort = /^[\p{L}_][\p{L}\p{N}_]*/u.exec(text.slice(i));
    if (wort) {
      const pos = i;
      let name = wort[0];
      i += name.length;
      const bekannt = WORTE[name];
      if (bekannt) {
        tokens.push({ ...bekannt, pos });
        continue;
      }
      // Sensormethoden wie hindernisVorn() zählen als ein Name.
      const aufruf = /^\s*\(\s*\)/.exec(text.slice(i));
      if (aufruf) {
        name += '()';
        i += aufruf[0].length;
      }
      tokens.push({ art: 'bez', text: name, pos });
      continue;
    }
    throw new LogikFehler(`Unerwartetes Zeichen „${c}“ an Stelle ${i + 1}.`);
  }
  return tokens;
}

export function parseLogik(text: string): LKnoten {
  const tokens = tokenisiere(text);
  let stelle = 0;
  let naechsteId = 1;
  const id = () => naechsteId++;
  const schau = () => tokens[stelle];

  function oder(): LKnoten {
    let links = xor();
    while (schau()?.art === 'oder') {
      stelle++;
      links = { art: 'oder', id: id(), links, rechts: xor() };
    }
    return links;
  }
  function xor(): LKnoten {
    let links = und();
    while (schau()?.art === 'xor') {
      stelle++;
      links = { art: 'xor', id: id(), links, rechts: und() };
    }
    return links;
  }
  function und(): LKnoten {
    let links = nicht();
    while (schau()?.art === 'und') {
      stelle++;
      links = { art: 'und', id: id(), links, rechts: nicht() };
    }
    return links;
  }
  function nicht(): LKnoten {
    if (schau()?.art === 'nicht') {
      stelle++;
      const eigeneId = id();
      return { art: 'nicht', id: eigeneId, arg: nicht() };
    }
    return primaer();
  }
  function primaer(): LKnoten {
    const t = schau();
    if (!t) throw new LogikFehler('Der Ausdruck endet zu früh: Hier fehlt ein Wahrheitswert.');
    stelle++;
    if (t.art === 'bez') return { art: 'var', id: id(), name: t.text };
    if (t.art === 'konst') return { art: 'konst', id: id(), wert: t.text === 'true' };
    if (t.art === 'auf') {
      const eigeneId = id();
      const innen = oder();
      if (schau()?.art !== 'zu') throw new LogikFehler('Eine geöffnete Klammer wird nicht geschlossen.');
      stelle++;
      return { art: 'klammer', id: eigeneId, innen };
    }
    throw new LogikFehler(`„${t.text}“ steht an einer Stelle, an der ein Wahrheitswert erwartet wird.`);
  }

  if (tokens.length === 0) throw new LogikFehler('Der Ausdruck ist leer.');
  const wurzel = oder();
  if (stelle < tokens.length) {
    throw new LogikFehler(`„${tokens[stelle].text}“ passt hier nicht: Zwischen zwei Wahrheitswerten fehlt ein Operator.`);
  }
  return wurzel;
}

/** Variablen in der Reihenfolge ihres ersten Auftretens. */
export function variablen(k: LKnoten): string[] {
  const namen: string[] = [];
  const lauf = (n: LKnoten): void => {
    switch (n.art) {
      case 'var':
        if (!namen.includes(n.name)) namen.push(n.name);
        break;
      case 'konst':
        break;
      case 'nicht':
        lauf(n.arg);
        break;
      case 'klammer':
        lauf(n.innen);
        break;
      default:
        lauf(n.links);
        lauf(n.rechts);
    }
  };
  lauf(k);
  return namen;
}

export function werteAus(k: LKnoten, belegung: Belegung): boolean {
  switch (k.art) {
    case 'var': {
      const wert = belegung[k.name];
      if (wert === undefined) throw new LogikFehler(`Für „${k.name}“ ist kein Wahrheitswert angegeben.`);
      return wert;
    }
    case 'konst':
      return k.wert;
    case 'nicht':
      return !werteAus(k.arg, belegung);
    case 'klammer':
      return werteAus(k.innen, belegung);
    case 'und':
      return werteAus(k.links, belegung) && werteAus(k.rechts, belegung);
    case 'oder':
      return werteAus(k.links, belegung) || werteAus(k.rechts, belegung);
    case 'xor':
      return werteAus(k.links, belegung) !== werteAus(k.rechts, belegung);
  }
}

const SYMBOL: Record<Notation, Record<'nicht' | 'und' | 'oder' | 'xor', string>> = {
  java: { nicht: '!', und: '&&', oder: '||', xor: '^' },
  mathe: { nicht: '¬', und: '∧', oder: '∨', xor: '⊕' },
};

export function symbol(art: 'nicht' | 'und' | 'oder' | 'xor', notation: Notation): string {
  return SYMBOL[notation][art];
}

export function zeigeWert(wert: boolean, notation: Notation): string {
  return notation === 'java' ? String(wert) : wert ? '1' : '0';
}

export function formatiereLogik(k: LKnoten, notation: Notation = 'java', namen: Record<string, string> = {}): string {
  switch (k.art) {
    case 'var':
      return namen[k.name] ?? k.name;
    case 'konst':
      return zeigeWert(k.wert, notation);
    case 'nicht':
      return symbol('nicht', notation) + formatiereLogik(k.arg, notation, namen);
    case 'klammer':
      return `(${formatiereLogik(k.innen, notation, namen)})`;
    default:
      return `${formatiereLogik(k.links, notation, namen)} ${symbol(k.art, notation)} ${formatiereLogik(k.rechts, notation, namen)}`;
  }
}

/**
 * Wertet stur von links nach rechts aus, ohne Punkt-vor-Strich-Regel (Klammern und
 * direkt vorangestellte Negationen werden beachtet). Dient dazu, Aufgaben zu finden,
 * bei denen dieser typische Fehler zu einem falschen Ergebnis führt.
 */
export function naivLinksNachRechts(k: LKnoten, belegung: Belegung): boolean {
  type Teil = { op?: 'und' | 'oder' | 'xor'; wert: boolean };
  const flach = (n: LKnoten): Teil[] => {
    if (n.art === 'und' || n.art === 'oder' || n.art === 'xor') {
      const rechts = flach(n.rechts);
      rechts[0] = { ...rechts[0], op: n.art };
      return [...flach(n.links), ...rechts];
    }
    if (n.art === 'klammer') return [{ wert: naivLinksNachRechts(n.innen, belegung) }];
    if (n.art === 'nicht') return [{ wert: !naivLinksNachRechts(n.arg, belegung) }];
    return [{ wert: werteAus(n, belegung) }];
  };
  const teile = flach(k);
  let ergebnis = teile[0].wert;
  for (const teil of teile.slice(1)) {
    if (teil.op === 'und') ergebnis = ergebnis && teil.wert;
    else if (teil.op === 'oder') ergebnis = ergebnis || teil.wert;
    else ergebnis = ergebnis !== teil.wert;
  }
  return ergebnis;
}
