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
