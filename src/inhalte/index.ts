import { AUFGABEN_B1 } from './aufgaben/b1';
import { AUFGABEN_B21_B23 } from './aufgaben/b21-b23';
import { AUFGABEN_B24 } from './aufgaben/b24';
import { AUFGABEN_B27 } from './aufgaben/b27';
import { EINHEITEN } from './einheiten';
import { LEKTIONEN_B1 } from './lektionen/b1';
import { LEKTIONEN_B21_B23 } from './lektionen/b21-b23';
import { LEKTIONEN_B24 } from './lektionen/b24';
import { LEKTIONEN_B27 } from './lektionen/b27';
import type { Abschnitt, Aufgabe, Lektion } from './typen';

export * from './typen';
export { BEREICHE, KANNLISTE, kannItem } from './kannliste';
export { OPERATOREN, operator } from './operatoren';
export { EINHEITEN };

export const AUFGABEN: Aufgabe[] = [...AUFGABEN_B1, ...AUFGABEN_B21_B23, ...AUFGABEN_B24, ...AUFGABEN_B27];
export const LEKTIONEN: Lektion[] = [...LEKTIONEN_B1, ...LEKTIONEN_B21_B23, ...LEKTIONEN_B24, ...LEKTIONEN_B27];

const aufgabenNachId = new Map(AUFGABEN.map((a) => [a.id, a]));
const lektionenNachId = new Map(LEKTIONEN.map((l) => [l.id, l]));

export function aufgabe(id: string): Aufgabe | undefined {
  return aufgabenNachId.get(id);
}

export function lektion(id: string): Lektion | undefined {
  return lektionenNachId.get(id);
}

export function aufgabenFuerKann(kannId: string): Aufgabe[] {
  return AUFGABEN.filter((a) => a.kann.includes(kannId));
}

export function lektionenFuerKann(kannId: string): Lektion[] {
  return LEKTIONEN.filter((l) => l.kann.includes(kannId));
}

export type Merksatz = Extract<Abschnitt, { art: 'merksatz' }>;

export function alleMerksaetze(): { lektion: Lektion; merksatz: Merksatz }[] {
  return LEKTIONEN.flatMap((l) =>
    l.abschnitte.filter((a): a is Merksatz => a.art === 'merksatz').map((merksatz) => ({ lektion: l, merksatz })),
  );
}

export const TYP_NAMEN: Record<Aufgabe['typ'], string> = {
  auswahl: 'Auswahl',
  zuordnen: 'Zuordnen',
  reihenfolge: 'Reihenfolge',
  freitext: 'Freitext',
  luecke: 'Lücken',
  wahrheitstabelle: 'Wahrheitstabelle',
  auswertung: 'Ausdruck auswerten',
  'klassen-lesen': 'Klassendiagramm lesen',
};
