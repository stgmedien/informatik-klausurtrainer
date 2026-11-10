import { describe, expect, it } from 'vitest';
import { AUFGABEN, EINHEITEN, aufgabe } from '../../src/inhalte';
import type { Aufgabe } from '../../src/inhalte';
import {
  bewerteAuswahl,
  bewerteKlassenLesen,
  bewerteLuecken,
  bewerteReihenfolge,
  bewerteTabelle,
  bewerteZuordnen,
  eintraegeKlassenLesen,
  loesungTabelle,
  normalisiere,
} from '../../src/lernen/bewertung';
import { aufwaermAufgaben, einheitMinuten, faelligeKann, istVerfuegbar, naechsteEinheit } from '../../src/lernen/planer';
import { type Lernstand, type Versuch, kannStand, neuerStand, plusTage, tageBis, verbuche } from '../../src/lernen/stand';

function hole<T extends Aufgabe['typ']>(id: string, typ: T): Extract<Aufgabe, { typ: T }> {
  const a = aufgabe(id);
  if (!a || a.typ !== typ) throw new Error(`Aufgabe ${id} fehlt oder hat nicht den Typ ${typ}`);
  return a as Extract<Aufgabe, { typ: T }>;
}

describe('Automatische Bewertung', () => {
  it('Auswahl: Einzelauswahl gibt alles oder nichts', () => {
    const a = hole('b1-extends-lesen', 'auswahl');
    const richtig = a.optionen.findIndex((o) => o.richtig);
    expect(bewerteAuswahl(a, new Set([richtig])).punkte).toBe(a.punkte);
    expect(bewerteAuswahl(a, new Set([(richtig + 1) % a.optionen.length])).punkte).toBe(0);
  });

  it('Auswahl: Mehrfachauswahl zählt jede richtige Entscheidung', () => {
    const a = hole('b1-aussagen-klasse', 'auswahl');
    const alleRichtigen = new Set(a.optionen.flatMap((o, i) => (o.richtig ? [i] : [])));
    expect(bewerteAuswahl(a, alleRichtigen)).toEqual({ punkte: a.punkte, max: a.punkte });
    // Alles ankreuzen darf nicht die volle Punktzahl bringen.
    expect(bewerteAuswahl(a, new Set(a.optionen.map((_, i) => i))).punkte).toBeLessThan(a.punkte);
  });

  it('Zuordnen und Reihenfolge', () => {
    const z = hole('b1-begriffe-zuordnen', 'zuordnen');
    const loesung = Object.fromEntries(z.elemente.map((e, i) => [i, e.kategorie]));
    expect(bewerteZuordnen(z, loesung).punkte).toBe(z.punkte);
    expect(bewerteZuordnen(z, { ...loesung, 0: 'falsch' }).punkte).toBe(z.punkte - 1);

    const r = hole('b27-reihenfolge', 'reihenfolge');
    expect(bewerteReihenfolge(r, r.elemente).punkte).toBe(r.punkte);
    expect(bewerteReihenfolge(r, [...r.elemente].reverse()).punkte).toBe(1); // nur die Mitte stimmt
  });

  it('Lücken: Leerzeichen egal, bei Quelltext zählt die Groß-/Kleinschreibung', () => {
    expect(normalisiere(' ! hindernisVorn( ) ', true)).toBe('!hindernisVorn()');
    expect(normalisiere('  Unterklasse ', false)).toBe('unterklasse');
    const code = hole('b22-syntax-luecken', 'luecke');
    const loesung = Object.fromEntries(Object.entries(code.luecken).map(([id, l]) => [id, l.akzeptiert[0]]));
    expect(bewerteLuecken(code, loesung).punkte).toBe(code.punkte);
    expect(bewerteLuecken(code, { ...loesung, while: 'While' }).punkte).toBe(code.punkte - 1);
    const text = hole('b1-vererbung-luecken', 'luecke');
    expect(bewerteLuecken(text, { unter: 'unterklasse', ober: 'OBERKLASSE', erbt: 'erbt', spez: 'Spezialisierung', gen: 'Verallgemeinerung' }).punkte).toBe(text.punkte);
  });

  it('Jede Musterlösung einer Lückenaufgabe wird als richtig erkannt', () => {
    for (const a of AUFGABEN) {
      if (a.typ !== 'luecke') continue;
      for (const [id, l] of Object.entries(a.luecken)) {
        for (const ok of l.akzeptiert) expect(bewerteLuecken(a, { [id]: ok }).punkte, `${a.id}/${id}`).toBeGreaterThan(0);
      }
    }
  });

  it('Wahrheitstabelle und Klassendiagramm', () => {
    const t = hole('b24-tabelle-nor', 'wahrheitstabelle');
    expect(loesungTabelle(t)).toEqual([true, false, false, false]);
    expect(bewerteTabelle(t, [true, false, false, false]).punkte).toBe(t.punkte);
    expect(bewerteTabelle(t, [true, true, false, undefined]).punkte).toBe(t.punkte / 2);

    const k = hole('b1-diagramm-cabrio', 'klassen-lesen');
    const richtig = new Set(eintraegeKlassenLesen(k).flatMap((e) => (e.besitzt ? [`${e.art}:${e.name}`] : [])));
    expect([...richtig].sort()).toEqual(['attribut:anzahlTueren', 'attribut:geschwindigkeit', 'attribut:marke', 'attribut:verdeckOffen']);
    expect(bewerteKlassenLesen(k, richtig).punkte).toBe(k.punkte);
    expect(bewerteKlassenLesen(k, new Set([...richtig, 'attribut:hatBeiwagen'])).punkte).toBeLessThan(k.punkte);
  });
});

function versuch(teil: Partial<Versuch>): Versuch {
  return {
    id: Math.random().toString(36),
    aufgabe: 'b1-begriffe-zuordnen',
    kann: ['k1-begriffe'],
    zeit: `${teil.tag ?? '2026-11-10'}T10:00:00.000Z`,
    tag: '2026-11-10',
    punkte: 10,
    max: 10,
    quelle: 'automatisch',
    hinweise: 0,
    klausurnah: false,
    ...teil,
  };
}

describe('Beherrschungsgrad', () => {
  it('rechnet mit Kalendertagen', () => {
    expect(plusTage('2026-11-30', 1)).toBe('2026-12-01');
    expect(tageBis('2026-11-10', '2026-11-17')).toBe(7);
  });

  it('einmal ohne Hinweis richtig → sicher; zweiter Tag plus Klausurformat → klausurfest', () => {
    let s: Lernstand = neuerStand();
    expect(kannStand(s, 'k1-begriffe').grad).toBe(0);
    s = verbuche(s, versuch({}));
    expect(kannStand(s, 'k1-begriffe').grad).toBe(2);
    // Am selben Tag noch einmal richtig ändert nichts.
    s = verbuche(s, versuch({ klausurnah: true }));
    expect(kannStand(s, 'k1-begriffe').grad).toBe(2);
    s = verbuche(s, versuch({ tag: '2026-11-11' }));
    expect(kannStand(s, 'k1-begriffe').grad).toBe(3);
  });

  it('zwei Tage ohne Klausurformat reichen nicht für klausurfest', () => {
    let s = verbuche(neuerStand(), versuch({}));
    s = verbuche(s, versuch({ tag: '2026-11-11' }));
    expect(kannStand(s, 'k1-begriffe').grad).toBe(2);
  });

  it('mit Hinweis gelöst zählt nur als geübt und ist morgen wieder fällig', () => {
    const s = verbuche(neuerStand(), versuch({ hinweise: 1 }));
    expect(kannStand(s, 'k1-begriffe')).toMatchObject({ grad: 1, faelligAm: '2026-11-11' });
  });

  it('ein Fehler senkt den Grad um eine Stufe', () => {
    let s = verbuche(neuerStand(), versuch({}));
    s = verbuche(s, versuch({ tag: '2026-11-11', klausurnah: true }));
    expect(kannStand(s, 'k1-begriffe').grad).toBe(3);
    s = verbuche(s, versuch({ tag: '2026-11-12', punkte: 4 }));
    expect(kannStand(s, 'k1-begriffe')).toMatchObject({ grad: 2, faelligAm: '2026-11-13' });
    s = verbuche(s, versuch({ tag: '2026-11-13', punkte: 0 }));
    s = verbuche(s, versuch({ tag: '2026-11-13', punkte: 0 }));
    expect(kannStand(s, 'k1-begriffe').grad).toBe(1);
  });
});

describe('Planer', () => {
  it('führt der Reihe nach durch die verfügbaren Einheiten', () => {
    let s = neuerStand();
    expect(naechsteEinheit(s)?.id).toBe('e1');
    s = { ...s, einheiten: { e1: { schritt: 10, fertigAm: '2026-11-10' } } };
    expect(naechsteEinheit(s)?.id).toBe('e2');
  });

  it('hält jede verfügbare Einheit bei 20 bis 30 Minuten', () => {
    for (const e of EINHEITEN.filter(istVerfuegbar)) {
      const minuten = einheitMinuten(e);
      expect(minuten, `${e.id}: ${minuten} min`).toBeGreaterThanOrEqual(20);
      expect(minuten, `${e.id}: ${minuten} min`).toBeLessThanOrEqual(30);
    }
  });

  it('wählt Aufwärmfragen nur zu fälligen Lernzielen und nie aus der laufenden Einheit', () => {
    let s = verbuche(neuerStand(), versuch({ punkte: 2 }));
    expect(faelligeKann(s, '2026-11-10')).toEqual([]);
    expect(faelligeKann(s, '2026-11-11')).toEqual(['k1-begriffe']);
    const wahl = aufwaermAufgaben(s, '2026-11-11', new Set(['b1-objektdiagramm']));
    expect(wahl).toHaveLength(1);
    expect(aufgabe(wahl[0])?.kann).toContain('k1-begriffe');
    expect(wahl[0]).not.toBe('b1-objektdiagramm');
    // Was heute schon bearbeitet wurde, kommt nicht noch einmal.
    s = verbuche(s, versuch({ aufgabe: wahl[0], tag: '2026-11-11', punkte: 2 }));
    expect(aufwaermAufgaben(s, '2026-11-11', new Set(['b1-objektdiagramm']))).not.toContain(wahl[0]);
  });
});
