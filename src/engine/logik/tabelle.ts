import { type Belegung, type LKnoten, variablen, werteAus } from './ausdruck';

export interface Wahrheitstabelle {
  variablen: string[];
  zeilen: { werte: boolean[]; ergebnis: boolean }[];
}

/** Alle Belegungen in der Reihenfolge 00, 01, 10, 11 … (wie in Anhang A des Skripts). */
export function alleBelegungen(namen: string[]): Belegung[] {
  const anzahl = 2 ** namen.length;
  const liste: Belegung[] = [];
  for (let zeile = 0; zeile < anzahl; zeile++) {
    const belegung: Belegung = {};
    namen.forEach((name, i) => {
      belegung[name] = Boolean((zeile >> (namen.length - 1 - i)) & 1);
    });
    liste.push(belegung);
  }
  return liste;
}

export function wahrheitstabelle(k: LKnoten, reihenfolge?: string[]): Wahrheitstabelle {
  const namen = reihenfolge ?? variablen(k);
  return {
    variablen: namen,
    zeilen: alleBelegungen(namen).map((belegung) => ({
      werte: namen.map((name) => belegung[name]),
      ergebnis: werteAus(k, belegung),
    })),
  };
}

/** Die sechs Grundfunktionen aus der Kann-Liste, ausgeschrieben wie im Unterricht. */
export const GRUNDFUNKTIONEN = [
  { id: 'nicht', name: 'NICHT (NOT)', formel: 'Y = ¬A', ausdruck: '!A' },
  { id: 'und', name: 'UND (AND)', formel: 'Y = A ∧ B', ausdruck: 'A && B' },
  { id: 'oder', name: 'ODER (OR)', formel: 'Y = A ∨ B', ausdruck: 'A || B' },
  { id: 'nand', name: 'NICHT UND (NAND)', formel: 'Y = ¬(A ∧ B)', ausdruck: '!(A && B)' },
  { id: 'nor', name: 'NICHT ODER (NOR)', formel: 'Y = ¬(A ∨ B)', ausdruck: '!(A || B)' },
  { id: 'xor', name: 'EXKLUSIV-ODER (XOR)', formel: 'Y = A ⊕ B', ausdruck: '!A && B || A && !B' },
] as const;
