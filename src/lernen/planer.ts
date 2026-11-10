// Wählt aus, was heute dran ist: nächste Einheit und passende Aufwärmfragen.
import { AUFGABEN, EINHEITEN, KANNLISTE, aufgabe, lektion } from '../inhalte';
import type { Aufgabe, Einheit, EinheitSchritt } from '../inhalte/typen';
import { type Grad, type Lernstand, kannStand, letzterVersuch } from './stand';

export function istVerfuegbar(e: Einheit): boolean {
  return e.schritte.length > 0;
}

export function naechsteEinheit(stand: Lernstand): Einheit | undefined {
  return EINHEITEN.find((e) => istVerfuegbar(e) && !stand.einheiten[e.id]?.fertigAm);
}

export function schrittMinuten(s: EinheitSchritt): number {
  if (s.art === 'lektion') return lektion(s.id)?.minuten ?? 0;
  if (s.art === 'aufgabe') return aufgabe(s.id)?.minuten ?? 0;
  return s.anzahl * 2;
}

export function einheitMinuten(e: Einheit): number {
  return e.schritte.reduce((summe, s) => summe + schrittMinuten(s), 0);
}

/** Lernziele, die heute wiederholt werden sollten: schon geübt und fällig (oder noch wackelig). */
export function faelligeKann(stand: Lernstand, tag: string): string[] {
  return KANNLISTE.map((k) => ({ id: k.id, s: kannStand(stand, k.id) }))
    .filter(({ s }) => s.grad > 0 && s.grad < 3 && (s.faelligAm ?? tag) <= tag)
    .sort((x, y) => x.s.grad - y.s.grad || (x.s.faelligAm ?? '').localeCompare(y.s.faelligAm ?? ''))
    .map(({ id }) => id);
}

const SCHNELL: Aufgabe['typ'][] = ['auswahl', 'zuordnen', 'reihenfolge', 'luecke', 'wahrheitstabelle', 'auswertung', 'klassen-lesen'];

/**
 * Kurze, automatisch auswertbare Aufgaben zu fälligen Lernzielen – als Abruf zu Beginn einer Einheit.
 * Bevorzugt Aufgaben, die am längsten nicht bearbeitet wurden, und nie solche, die heute schon dran waren.
 */
export function aufwaermAufgaben(stand: Lernstand, tag: string, ohne: ReadonlySet<string>, max = 3): string[] {
  const gewaehlt: string[] = [];
  for (const kannId of faelligeKann(stand, tag)) {
    if (gewaehlt.length >= max) break;
    const kandidaten = AUFGABEN.filter(
      (a) => a.kann.includes(kannId) && SCHNELL.includes(a.typ) && a.minuten <= 2 && !ohne.has(a.id) && !gewaehlt.includes(a.id),
    )
      .map((a) => ({ a, zuletzt: letzterVersuch(stand, a.id) }))
      .filter(({ zuletzt }) => zuletzt?.tag !== tag)
      .sort((x, y) => (x.zuletzt?.zeit ?? '').localeCompare(y.zuletzt?.zeit ?? ''));
    if (kandidaten[0]) gewaehlt.push(kandidaten[0].a.id);
  }
  return gewaehlt;
}

export function zaehleGrade(stand: Lernstand): Record<Grad, number> {
  const zahl: Record<Grad, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const k of KANNLISTE) zahl[kannStand(stand, k.id).grad]++;
  return zahl;
}

export function aufgabenIdsDerEinheit(e: Einheit): Set<string> {
  return new Set(e.schritte.filter((s) => s.art === 'aufgabe').map((s) => s.id));
}
