// Automatische Bewertung der Aufgabentypen, bei denen sich die Lösung berechnen lässt.
import { besitz } from '../engine/klassen';
import { parseLogik, wahrheitstabelle } from '../engine/logik';
import type { Aufgabe } from '../inhalte/typen';

export interface Bewertung {
  punkte: number;
  max: number;
}

type Von<T extends Aufgabe['typ']> = Extract<Aufgabe, { typ: T }>;

/** Rundet auf halbe Punkte, wie bei einer Korrektur von Hand. */
function anteil(richtig: number, gesamt: number, max: number): Bewertung {
  const punkte = gesamt === 0 ? 0 : Math.round((richtig / gesamt) * max * 2) / 2;
  return { punkte, max };
}

export function bewerteAuswahl(a: Von<'auswahl'>, gewaehlt: ReadonlySet<number>): Bewertung {
  const treffer = a.optionen.filter((o, i) => o.richtig === gewaehlt.has(i)).length;
  if (!a.mehrfach) return { punkte: treffer === a.optionen.length ? a.punkte : 0, max: a.punkte };
  return anteil(treffer, a.optionen.length, a.punkte);
}

export function bewerteZuordnen(a: Von<'zuordnen'>, wahl: Readonly<Record<number, string>>): Bewertung {
  const treffer = a.elemente.filter((e, i) => wahl[i] === e.kategorie).length;
  return anteil(treffer, a.elemente.length, a.punkte);
}

export function bewerteReihenfolge(a: Von<'reihenfolge'>, folge: readonly string[]): Bewertung {
  const treffer = a.elemente.filter((e, i) => folge[i] === e).length;
  return anteil(treffer, a.elemente.length, a.punkte);
}

/** Vergleich ohne Rücksicht auf Leerzeichen; bei Quelltext zählt die Groß-/Kleinschreibung. */
export function normalisiere(text: string, code: boolean): string {
  const ohneLeer = text.replace(/\s+/g, code ? '' : ' ').trim();
  return code ? ohneLeer : ohneLeer.toLowerCase();
}

export function lueckeRichtig(a: Von<'luecke'>, id: string, eingabe: string): boolean {
  const code = Boolean(a.code);
  return a.luecken[id].akzeptiert.some((ok) => normalisiere(ok, code) === normalisiere(eingabe, code));
}

export function bewerteLuecken(a: Von<'luecke'>, eingaben: Readonly<Record<string, string>>): Bewertung {
  const ids = Object.keys(a.luecken);
  const treffer = ids.filter((id) => lueckeRichtig(a, id, eingaben[id] ?? '')).length;
  return anteil(treffer, ids.length, a.punkte);
}

export function loesungTabelle(a: Von<'wahrheitstabelle'>): boolean[] {
  return wahrheitstabelle(parseLogik(a.ausdruck)).zeilen.map((z) => z.ergebnis);
}

export function bewerteTabelle(a: Von<'wahrheitstabelle'>, eingaben: readonly (boolean | undefined)[]): Bewertung {
  const loesung = loesungTabelle(a);
  const treffer = loesung.filter((wert, i) => eingaben[i] === wert).length;
  return anteil(treffer, loesung.length, a.punkte);
}

export interface KlassenEintrag {
  art: 'attribut' | 'methode';
  name: string;
  besitzt: boolean;
  /** Klasse, aus der das Mitglied stammt (nur wenn besitzt). */
  von?: string;
}

/** Alle Attribute/Methoden des Diagramms mit der Angabe, ob ein Objekt der Klasse sie besitzt. */
export function eintraegeKlassenLesen(a: Von<'klassen-lesen'>): KlassenEintrag[] {
  const eigen = besitz(a.modell, a.objektDerKlasse);
  const eintraege: KlassenEintrag[] = [];
  const gesehen = new Set<string>();
  for (const klasse of a.modell.klassen) {
    if (a.gesucht !== 'methoden') {
      for (const attr of klasse.attribute) {
        if (gesehen.has(`a:${attr.name}`)) continue;
        gesehen.add(`a:${attr.name}`);
        const treffer = eigen.attribute.find((m) => m.name === attr.name);
        eintraege.push({ art: 'attribut', name: attr.name, besitzt: Boolean(treffer), von: treffer?.von });
      }
    }
    if (a.gesucht !== 'attribute') {
      for (const m of klasse.methoden) {
        if (gesehen.has(`m:${m.name}`)) continue;
        gesehen.add(`m:${m.name}`);
        const treffer = eigen.methoden.find((x) => x.name === m.name);
        eintraege.push({ art: 'methode', name: m.name, besitzt: Boolean(treffer), von: treffer?.von });
      }
    }
  }
  return eintraege;
}

export function bewerteKlassenLesen(a: Von<'klassen-lesen'>, gewaehlt: ReadonlySet<string>): Bewertung {
  const eintraege = eintraegeKlassenLesen(a);
  const treffer = eintraege.filter((e) => gewaehlt.has(`${e.art}:${e.name}`) === e.besitzt).length;
  return anteil(treffer, eintraege.length, a.punkte);
}
