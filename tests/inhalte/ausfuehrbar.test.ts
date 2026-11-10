import { describe, expect, it } from 'vitest';
import { pruefeEinrueckung } from '../../src/engine/java';
import { AUFGABEN } from '../../src/inhalte';
import { baueWelt, uebersetze } from '../../src/lernen/ausfuehren';
import { loeseVorhersage } from '../../src/lernen/bewertung';

// Jede Aufgabe mit Quelltext wird hier wirklich ausgeführt. So kann keine Musterantwort falsch sein.

describe('Vorhersage-Aufgaben', () => {
  for (const a of AUFGABEN) {
    if (a.typ !== 'vorhersage') continue;
    it(a.id, () => {
      const { programm, diagnosen } = uebersetze(a.quelltext);
      expect(diagnosen.filter((d) => d.schwere !== 'stil'), 'Quelltext ohne Fehler und Warnungen').toEqual([]);
      expect(programm).not.toBeNull();
      // Musterquelltext ist so eingerückt, wie es im Unterricht verlangt wird.
      expect(pruefeEinrueckung(a.quelltext), 'Einrückung').toEqual([]);
      expect(() => baueWelt(a.welt)).not.toThrow();

      const { loesung, ausfuehrung } = loeseVorhersage(a);
      // Die angegebene Erwartung muss genau dem tatsächlichen Lauf entsprechen.
      for (const [frage, wert] of Object.entries(a.erwartet)) {
        expect(loesung[frage as keyof typeof loesung], frage).toEqual(wert);
      }
      for (const f of a.fragen) expect(a.erwartet[f], `erwartet.${f} fehlt`).not.toBeUndefined();
      if (a.erwartet.endet !== false) expect(ausfuehrung.lauf.ende.grund).toBe('fertig');
      expect(ausfuehrung.lauf.schritte.length).toBeGreaterThan(0);
    });
  }
});

import { fuehreTestAus, bewerteProgramm, strukturMerkmale } from '../../src/lernen/programm';
import { bewerteZeilen, zeilenDerLoesung } from '../../src/lernen/bewertung';
import { endzustand } from '../../src/engine/welt';

describe('Programmieraufgaben', () => {
  for (const a of AUFGABEN) {
    if (a.typ !== 'programmieren') continue;
    describe(a.id, () => {
      it('Musterlösung ist fehlerfrei, eingerückt und besteht alle Testwelten ohne Meldung', () => {
        const { programm, diagnosen } = uebersetze(a.musterloesung);
        expect(diagnosen.filter((d) => d.schwere !== 'stil')).toEqual([]);
        expect(pruefeEinrueckung(a.musterloesung)).toEqual([]);
        const b = bewerteProgramm(a, a.musterloesung);
        expect(b.tests.map((t) => [t.test.name, t.bestanden, t.grund ?? ''])).toEqual(b.tests.map((t) => [t.test.name, true, '']));
        expect(b.punkte, 'volle Punktzahl').toBe(a.punkte);
        for (const t of a.tests) {
          const lauf = fuehreTestAus(programm!, a.methode, t);
          expect(lauf.ende.grund, t.name).toBe('fertig');
          expect(lauf.konsole, `${t.name}: keine Meldung`).toEqual([]);
          expect(endzustand(lauf.endwelt).lebt).toBe(true);
        }
        const merkmale = strukturMerkmale(programm!, a.methode);
        for (const m of a.struktur?.muss ?? []) expect(merkmale.has(m), `Musterlösung enthält ${m}`).toBe(true);
        for (const m of a.struktur?.verboten ?? []) expect(merkmale.has(m), `Musterlösung vermeidet ${m}`).toBe(false);
      });

      it('jede Testwelt ist gültig, mindestens eine ist sichtbar', () => {
        for (const t of a.tests) expect(() => baueWelt(t.welt), t.name).not.toThrow();
        expect(a.tests.some((t, i) => t.sichtbar ?? i === 0)).toBe(true);
        expect(a.tests.length).toBeGreaterThanOrEqual(2);
      });

      it('jede Fehlvariante fällt in mindestens einer Testwelt durch und wird erkannt', () => {
        for (const v of a.fehlvarianten ?? []) {
          expect(uebersetze(v.quelltext).programm, 'Fehlvariante ist ausführbar').not.toBeNull();
          const b = bewerteProgramm(a, v.quelltext);
          expect(b.tests.some((t) => !t.bestanden), v.erklaerung).toBe(true);
          expect(b.fehlvariante, 'wird als bekannte Fehlvariante erkannt').toBe(v.erklaerung);
          expect(b.muster).toContain(v.muster);
        }
      });

      it('die unveränderte Vorlage erreicht nicht die volle Punktzahl', () => {
        expect(bewerteProgramm(a, a.vorlage).punkte).toBeLessThan(a.punkte);
      });
    });
  }
});

describe('Zeilen ordnen', () => {
  for (const a of AUFGABEN) {
    if (a.typ !== 'zeilen-ordnen') continue;
    it(a.id, () => {
      const zeilen = zeilenDerLoesung(a.loesung);
      expect(bewerteZeilen(a, zeilen).punkte).toBe(a.punkte);
      expect(bewerteZeilen(a, [...zeilen].reverse()).punkte).toBeLessThan(a.punkte);
      expect(bewerteZeilen(a, zeilen.map((z) => ({ ...z, stufe: 0 }))).punkte).toBeLessThan(a.punkte);
      // Die Lösung ist gültiges, korrekt eingerücktes Java.
      expect(uebersetze(a.loesung).diagnosen.filter((d) => d.schwere !== 'stil')).toEqual([]);
      expect(pruefeEinrueckung(a.loesung)).toEqual([]);
      for (const d of a.distraktoren ?? []) expect(zeilen.map((z) => z.text)).not.toContain(d.trim());
    });
  }
});

import { checkliste, struktogrammeMitHilfsmethoden } from '../../src/engine/strukto';

describe('Struktogramm zeichnen', () => {
  for (const a of AUFGABEN) {
    if (a.typ !== 'struktogramm-zeichnen') continue;
    it(a.id, () => {
      const { programm, diagnosen } = uebersetze(a.musterloesung);
      expect(diagnosen.filter((d) => d.schwere !== 'stil')).toEqual([]);
      expect(pruefeEinrueckung(a.musterloesung)).toEqual([]);
      const bilder = struktogrammeMitHilfsmethoden(programm!, a.methode);
      expect(bilder[0].bloecke.length).toBeGreaterThan(0);
      expect(checkliste(bilder[0]).length).toBeGreaterThan(1);
    });
  }
});
