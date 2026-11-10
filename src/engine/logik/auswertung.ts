// Schrittweises Auswerten wie auf Papier: Der Ausdruck wird Zeile für Zeile kürzer.
import { type Belegung, type LKnoten, type Notation, symbol, werteAus, zeigeWert } from './ausdruck';

/** Bereits ausgerechnete Teilausdrücke: Knoten-ID → Wahrheitswert. */
export type Ausgewertet = ReadonlyMap<number, boolean>;

export type OperatorKnoten = Extract<LKnoten, { art: 'nicht' | 'und' | 'oder' | 'xor' }>;

export interface SichtToken {
  text: string;
  art: 'wert' | 'operator' | 'klammer';
  knoten: number;
  wert?: boolean;
}

function istWert(k: LKnoten, fertig: Ausgewertet): boolean {
  if (fertig.has(k.id)) return true;
  if (k.art === 'var' || k.art === 'konst') return true;
  if (k.art === 'klammer') return istWert(k.innen, fertig);
  return false;
}

function operanden(k: OperatorKnoten): LKnoten[] {
  return k.art === 'nicht' ? [k.arg] : [k.links, k.rechts];
}

/** Ein Operator ist dran, wenn seine Operanden schon Wahrheitswerte sind. */
export function istBereit(k: OperatorKnoten, fertig: Ausgewertet): boolean {
  return !fertig.has(k.id) && operanden(k).every((o) => istWert(o, fertig));
}

export function alleOperatoren(k: LKnoten): OperatorKnoten[] {
  switch (k.art) {
    case 'var':
    case 'konst':
      return [];
    case 'klammer':
      return alleOperatoren(k.innen);
    case 'nicht':
      return [k, ...alleOperatoren(k.arg)];
    default:
      return [...alleOperatoren(k.links), k, ...alleOperatoren(k.rechts)];
  }
}

export function findeOperator(k: LKnoten, id: number): OperatorKnoten | undefined {
  return alleOperatoren(k).find((o) => o.id === id);
}

export function istFertig(k: LKnoten, fertig: Ausgewertet): boolean {
  return istWert(k, fertig);
}

/** Erklärt, warum ein angeklickter Operator noch nicht ausgewertet werden darf. */
export function warumNichtBereit(k: OperatorKnoten, fertig: Ausgewertet): string {
  const offen = operanden(k).find((o) => !istWert(o, fertig));
  if (!offen) return '';
  if (offen.art === 'klammer') return 'Noch nicht: Zuerst wird die Klammer ausgerechnet (0. Klammerung).';
  if (offen.art === 'nicht') return 'Noch nicht: Zuerst kommt die Negation (1. Negation), dann erst dieser Operator.';
  if (offen.art === 'und' && k.art === 'oder') {
    return 'Noch nicht: UND bindet stärker als ODER (2. Konjunktion vor 3. Disjunktion) – wie Punkt- vor Strichrechnung.';
  }
  return 'Noch nicht: Gleichrangige Operatoren werden von links nach rechts ausgewertet.';
}

export function rechne(k: OperatorKnoten, fertig: Ausgewertet, belegung: Belegung): boolean {
  const wert = (o: LKnoten): boolean => {
    const bekannt = fertig.get(o.id);
    if (bekannt !== undefined) return bekannt;
    if (o.art === 'klammer') return wert(o.innen);
    return werteAus(o, belegung);
  };
  if (k.art === 'nicht') return !wert(k.arg);
  const l = wert(k.links);
  const r = wert(k.rechts);
  return k.art === 'und' ? l && r : k.art === 'oder' ? l || r : l !== r;
}

/** Aktuelle Zeile als Tokenliste; ausgerechnete Teile erscheinen als ein Wert. */
export function sicht(k: LKnoten, fertig: Ausgewertet, belegung: Belegung, notation: Notation): SichtToken[] {
  const bekannt = fertig.get(k.id);
  if (bekannt !== undefined) return [{ text: zeigeWert(bekannt, notation), art: 'wert', knoten: k.id, wert: bekannt }];
  switch (k.art) {
    case 'var':
    case 'konst': {
      const wert = werteAus(k, belegung);
      return [{ text: zeigeWert(wert, notation), art: 'wert', knoten: k.id, wert }];
    }
    case 'klammer':
      // Eine Klammer um einen einzelnen Wert fällt weg.
      if (istWert(k.innen, fertig)) return sicht(k.innen, fertig, belegung, notation);
      return [
        { text: '(', art: 'klammer', knoten: k.id },
        ...sicht(k.innen, fertig, belegung, notation),
        { text: ')', art: 'klammer', knoten: k.id },
      ];
    case 'nicht':
      return [{ text: symbol('nicht', notation), art: 'operator', knoten: k.id }, ...sicht(k.arg, fertig, belegung, notation)];
    default:
      return [
        ...sicht(k.links, fertig, belegung, notation),
        { text: symbol(k.art, notation), art: 'operator', knoten: k.id },
        ...sicht(k.rechts, fertig, belegung, notation),
      ];
  }
}

export function zeileAlsText(tokens: SichtToken[]): string {
  let text = '';
  tokens.forEach((t, i) => {
    const vorher = tokens[i - 1];
    const ohneAbstand = i === 0 || vorher.text === '(' || t.text === ')' || (vorher.art === 'operator' && (vorher.text === '!' || vorher.text === '¬'));
    text += (ohneAbstand ? '' : ' ') + t.text;
  });
  return text;
}

const RANG: Record<OperatorKnoten['art'], number> = { nicht: 1, und: 2, xor: 3, oder: 4 };

function klammerTiefen(k: LKnoten, tiefe = 0, ziel = new Map<number, number>()): Map<number, number> {
  ziel.set(k.id, tiefe);
  if (k.art === 'klammer') klammerTiefen(k.innen, tiefe + 1, ziel);
  else if (k.art === 'nicht') klammerTiefen(k.arg, tiefe, ziel);
  else if (k.art !== 'var' && k.art !== 'konst') {
    klammerTiefen(k.links, tiefe, ziel);
    klammerTiefen(k.rechts, tiefe, ziel);
  }
  return ziel;
}

export interface Musterschritt {
  /** Regel, die in diesem Schritt angewendet wurde. */
  regel: string;
  zeile: string;
}

/**
 * Musterlösung in der Reihenfolge des Unterrichts: erst Klammern, dann alle Negationen,
 * dann UND, zuletzt ODER. Gleichrangige, gleichzeitig mögliche Schritte stehen in einer Zeile.
 */
export function musterloesung(k: LKnoten, belegung: Belegung, notation: Notation): Musterschritt[] {
  const fertig = new Map<number, boolean>();
  const tiefen = klammerTiefen(k);
  const schritte: Musterschritt[] = [{ regel: 'Werte einsetzen', zeile: zeileAlsText(sicht(k, fertig, belegung, notation)) }];
  const namen: Record<OperatorKnoten['art'], string> = {
    nicht: 'Negation',
    und: 'Konjunktion (UND)',
    xor: 'Exklusiv-ODER',
    oder: 'Disjunktion (ODER)',
  };
  for (;;) {
    const bereit = alleOperatoren(k).filter((o) => istBereit(o, fertig));
    if (bereit.length === 0) break;
    const schluessel = (o: OperatorKnoten) => -(tiefen.get(o.id) ?? 0) * 10 + RANG[o.art];
    const bester = Math.min(...bereit.map(schluessel));
    const dran = bereit.filter((o) => schluessel(o) === bester);
    const inKlammer = (tiefen.get(dran[0].id) ?? 0) > 0;
    const ergebnisse = dran.map((o) => [o.id, rechne(o, fertig, belegung)] as const);
    for (const [id, wert] of ergebnisse) fertig.set(id, wert);
    schritte.push({
      regel: (inKlammer ? 'in der Klammer: ' : '') + namen[dran[0].art],
      zeile: zeileAlsText(sicht(k, fertig, belegung, notation)),
    });
  }
  return schritte;
}
