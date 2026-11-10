import { describe, expect, it } from 'vitest';
import { besitz, pruefeModell } from '../../src/engine/klassen';
import { parseLogik, variablen } from '../../src/engine/logik';
import { AUFGABEN, EINHEITEN, KANNLISTE, LEKTIONEN, OPERATOREN, alleMerksaetze, aufgabe, lektion } from '../../src/inhalte';
import type { Material } from '../../src/inhalte';
import { eintraegeKlassenLesen, loesungTabelle } from '../../src/lernen/bewertung';

const kannIds = new Set(KANNLISTE.map((k) => k.id));

describe('Register', () => {
  it('hat eindeutige IDs', () => {
    for (const liste of [KANNLISTE, AUFGABEN, LEKTIONEN, EINHEITEN]) {
      const ids = liste.map((x) => x.id);
      expect(new Set(ids).size, ids.join(', ')).toBe(ids.length);
    }
    const merksatzIds = alleMerksaetze().map((m) => m.merksatz.id);
    expect(new Set(merksatzIds).size).toBe(merksatzIds.length);
  });

  it('verweist nur auf vorhandene Lernziele, Aufgaben und Lektionen', () => {
    for (const a of AUFGABEN) for (const k of a.kann) expect(kannIds.has(k), `${a.id} → ${k}`).toBe(true);
    for (const l of LEKTIONEN) for (const k of l.kann) expect(kannIds.has(k), `${l.id} → ${k}`).toBe(true);
    for (const e of EINHEITEN) {
      for (const s of e.schritte) {
        if (s.art === 'aufgabe') expect(aufgabe(s.id), `${e.id} → ${s.id}`).toBeDefined();
        if (s.art === 'lektion') expect(lektion(s.id), `${e.id} → ${s.id}`).toBeDefined();
      }
    }
  });

  it('nutzt nur bekannte Operatoren', () => {
    const namen = new Set(OPERATOREN.map((o) => o.name));
    for (const a of AUFGABEN) if (a.operator) expect(namen.has(a.operator), `${a.id}: ${a.operator}`).toBe(true);
  });
});

describe('Formales je Aufgabe', () => {
  for (const a of AUFGABEN) {
    it(a.id, () => {
      expect(a.kann.length).toBeGreaterThan(0);
      expect(a.hinweise).toHaveLength(3);
      for (const h of a.hinweise) expect(h.trim().length).toBeGreaterThan(10);
      expect(a.punkte).toBeGreaterThan(0);
      expect(a.minuten).toBeGreaterThan(0);

      for (const m of a.material ?? []) pruefeMaterial(m);

      switch (a.typ) {
        case 'auswahl': {
          const richtige = a.optionen.filter((o) => o.richtig).length;
          expect(richtige).toBeGreaterThan(0);
          if (!a.mehrfach) expect(richtige).toBe(1);
          for (const o of a.optionen) expect(o.warum.length).toBeGreaterThan(5);
          break;
        }
        case 'zuordnen':
          for (const e of a.elemente) expect(a.kategorien, `${e.text}`).toContain(e.kategorie);
          // Jede Kategorie kommt mindestens einmal vor, sonst wäre sie ein toter Knopf.
          for (const k of a.kategorien) expect(a.elemente.some((e) => e.kategorie === k), k).toBe(true);
          break;
        case 'reihenfolge':
          expect(new Set(a.elemente).size).toBe(a.elemente.length);
          expect(a.elemente.length).toBeGreaterThan(2);
          break;
        case 'freitext': {
          const summe = a.erwartung.kriterien.reduce((s, k) => s + k.punkte, 0);
          expect(summe, 'Punktsumme des Erwartungshorizonts').toBe(a.punkte);
          expect(a.operator, 'Freitextaufgaben brauchen einen Operator').toBeDefined();
          expect(a.erwartung.musterantwort.length).toBeGreaterThan(40);
          const ids = a.erwartung.kriterien.map((k) => k.id);
          expect(new Set(ids).size).toBe(ids.length);
          break;
        }
        case 'luecke': {
          const imText = [...a.vorlage.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
          expect(imText.sort()).toEqual(Object.keys(a.luecken).sort());
          for (const l of Object.values(a.luecken)) expect(l.akzeptiert.length).toBeGreaterThan(0);
          break;
        }
        case 'wahrheitstabelle': {
          const baum = parseLogik(a.ausdruck);
          const loesung = loesungTabelle(a);
          expect(loesung).toHaveLength(2 ** variablen(baum).length);
          // Eine Tabelle, die nur 0 oder nur 1 enthält, wäre keine sinnvolle Aufgabe.
          expect(new Set(loesung).size).toBe(2);
          for (const name of Object.keys(a.namen ?? {})) expect(variablen(baum)).toContain(name);
          break;
        }
        case 'auswertung': {
          const namen = variablen(parseLogik(a.ausdruck));
          expect(Object.keys(a.belegung).sort()).toEqual([...namen].sort());
          break;
        }
        case 'klassen-lesen': {
          expect(pruefeModell(a.modell)).toEqual([]);
          const eintraege = eintraegeKlassenLesen(a);
          // Es muss sowohl Treffer als auch Nieten geben, sonst ließe sich die Aufgabe durch „alles ankreuzen“ lösen.
          expect(eintraege.some((e) => e.besitzt)).toBe(true);
          expect(eintraege.some((e) => !e.besitzt)).toBe(true);
          const eigen = besitz(a.modell, a.objektDerKlasse);
          expect(eigen.attribute.length + eigen.methoden.length).toBeGreaterThan(0);
          break;
        }
      }
    });
  }
});

function pruefeMaterial(m: Material): void {
  if (m.art === 'klassendiagramm') expect(pruefeModell(m.modell)).toEqual([]);
  if (m.art === 'objekte') for (const o of m.objekte) expect(o.attribute.length).toBeGreaterThan(0);
  if (m.art === 'code') expect(m.quelltext.trim().length).toBeGreaterThan(0);
}

describe('Lektionen', () => {
  it('haben Inhalt und gültiges Material', () => {
    for (const l of LEKTIONEN) {
      expect(l.abschnitte.length, l.id).toBeGreaterThan(0);
      for (const a of l.abschnitte) if (a.art === 'material') pruefeMaterial(a.material);
    }
  });
  it('kennzeichnen jeden Merksatz mit einer Quelle', () => {
    for (const { merksatz } of alleMerksaetze()) expect(merksatz.quelle.length, merksatz.id).toBeGreaterThan(3);
  });
});

describe('Abdeckung der Kann-Liste', () => {
  // Diese Lernziele kommen erst mit späteren Ausbaustufen (Spinnenwelt, Struktogramme, Modellierung).
  const spaeter = new Set(['k1-modellieren', 'k25-lesen', 'k25-schreiben', 'k25-einruecken', 'k26-lesen', 'k26-modellieren', 'k26-ueberfuehren']);

  it('hat zu jedem bereits abgedeckten Lernziel mindestens eine Lektion und zwei Aufgaben', () => {
    for (const k of KANNLISTE) {
      if (spaeter.has(k.id)) continue;
      const aufgaben = AUFGABEN.filter((a) => a.kann.includes(k.id));
      expect(aufgaben.length, `${k.id}: Aufgaben`).toBeGreaterThanOrEqual(2);
      expect(LEKTIONEN.some((l) => l.kann.includes(k.id)), `${k.id}: Lektion`).toBe(true);
    }
  });

  it('gibt eine Übersicht aus', () => {
    const zeilen = KANNLISTE.map((k) => {
      const aufgaben = AUFGABEN.filter((a) => a.kann.includes(k.id));
      const klausurnah = aufgaben.filter((a) => a.klausurnah).length;
      return `${k.id.padEnd(28)} ${String(aufgaben.length).padStart(2)} Aufgaben, davon ${klausurnah} klausurnah`;
    });
    console.log(`\nKann-Liste × Aufgaben\n${zeilen.join('\n')}\n`);
    expect(zeilen).toHaveLength(KANNLISTE.length);
  });
});
