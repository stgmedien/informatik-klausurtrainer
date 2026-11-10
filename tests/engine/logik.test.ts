import { describe, expect, it } from 'vitest';
import {
  GRUNDFUNKTIONEN,
  LogikFehler,
  alleOperatoren,
  erzeugeAusdruck,
  erzeugeUebung,
  formatiereLogik,
  istBereit,
  istFertig,
  musterloesung,
  naivLinksNachRechts,
  parseLogik,
  rechne,
  variablen,
  wahrheitstabelle,
  warumNichtBereit,
  werteAus,
} from '../../src/engine/logik';

const ergebnisse = (ausdruck: string) => wahrheitstabelle(parseLogik(ausdruck)).zeilen.map((z) => (z.ergebnis ? 1 : 0));

describe('Grundfunktionen (Anhang A des Skripts)', () => {
  // Reihenfolge der Zeilen: (A,B) = 00, 01, 10, 11
  const erwartet: Record<string, number[]> = {
    nicht: [1, 0],
    und: [0, 0, 0, 1],
    oder: [0, 1, 1, 1],
    nand: [1, 1, 1, 0],
    nor: [1, 0, 0, 0],
    xor: [0, 1, 1, 0],
  };
  for (const f of GRUNDFUNKTIONEN) {
    it(f.name, () => expect(ergebnisse(f.ausdruck)).toEqual(erwartet[f.id]));
  }
  it('XOR ausgeschrieben entspricht dem Zeichen ⊕', () => {
    expect(ergebnisse('A ⊕ B')).toEqual(ergebnisse('!A && B || A && !B'));
  });
});

describe('Parser', () => {
  it('beachtet die Präzedenz: NICHT vor UND vor ODER', () => {
    expect(werteAus(parseLogik('A || B && C'), { A: true, B: false, C: false })).toBe(true);
    expect(werteAus(parseLogik('(A || B) && C'), { A: true, B: false, C: false })).toBe(false);
    expect(werteAus(parseLogik('!A && B'), { A: false, B: true })).toBe(true);
    expect(werteAus(parseLogik('!(A && B)'), { A: false, B: true })).toBe(true);
  });
  it('versteht Java- und Mathe-Schreibweise sowie Sensormethoden', () => {
    expect(ergebnisse('A ∧ ¬B')).toEqual(ergebnisse('A && !B'));
    expect(ergebnisse('A UND NICHT B')).toEqual(ergebnisse('A && !B'));
    expect(variablen(parseLogik('hindernisLinks() && !hindernisRechts()'))).toEqual(['hindernisLinks()', 'hindernisRechts()']);
  });
  it('formatiert verlustfrei', () => {
    for (const text of ['!A && B || A && !B', '!(A || B) && C', 'A || B && !C']) {
      expect(formatiereLogik(parseLogik(text), 'java')).toBe(text);
    }
    expect(formatiereLogik(parseLogik('!(A && B)'), 'mathe')).toBe('¬(A ∧ B)');
  });
  it('meldet fehlerhafte Ausdrücke verständlich', () => {
    for (const text of ['', 'A &&', '(A || B', 'A B', 'A && && B', 'A $ B']) {
      expect(() => parseLogik(text), text).toThrow(LogikFehler);
    }
  });
});

describe('Schrittweise Auswertung', () => {
  it('lässt ODER erst zu, wenn das UND daneben ausgerechnet ist', () => {
    const baum = parseLogik('A || B && C');
    const [oder, und] = [alleOperatoren(baum).find((o) => o.art === 'oder')!, alleOperatoren(baum).find((o) => o.art === 'und')!];
    const fertig = new Map<number, boolean>();
    expect(istBereit(oder, fertig)).toBe(false);
    expect(warumNichtBereit(oder, fertig)).toContain('UND bindet stärker');
    expect(istBereit(und, fertig)).toBe(true);
    fertig.set(und.id, rechne(und, fertig, { A: true, B: false, C: false }));
    expect(istBereit(oder, fertig)).toBe(true);
  });

  it('Musterlösung folgt der Reihenfolge Negation → UND → ODER', () => {
    const schritte = musterloesung(parseLogik('!A && B || A && !B'), { A: true, B: false }, 'java');
    expect(schritte.map((s) => s.zeile)).toEqual([
      '!true && false || true && !false',
      'false && false || true && true',
      'false || true',
      'true',
    ]);
    expect(schritte.map((s) => s.regel)).toEqual(['Werte einsetzen', 'Negation', 'Konjunktion (UND)', 'Disjunktion (ODER)']);
  });

  it('rechnet Klammern zuerst aus', () => {
    const schritte = musterloesung(parseLogik('!(A || B) && C'), { A: false, B: false, C: true }, 'mathe');
    expect(schritte.map((s) => s.zeile)).toEqual(['¬(0 ∨ 0) ∧ 1', '¬0 ∧ 1', '1 ∧ 1', '1']);
    expect(schritte[1].regel).toBe('in der Klammer: Disjunktion (ODER)');
  });

  it('kommt in jeder zulässigen Reihenfolge zum selben Ergebnis wie die direkte Auswertung', () => {
    for (let startwert = 1; startwert <= 200; startwert++) {
      for (const stufe of [1, 2, 3] as const) {
        const { ausdruck, belegung } = erzeugeUebung(startwert, stufe);
        const baum = parseLogik(ausdruck);
        const fertig = new Map<number, boolean>();
        // Immer den letzten bereiten Operator wählen (nicht die Musterreihenfolge).
        for (;;) {
          const bereit = alleOperatoren(baum).filter((o) => istBereit(o, fertig));
          if (bereit.length === 0) break;
          const o = bereit[bereit.length - 1];
          fertig.set(o.id, rechne(o, fertig, belegung));
        }
        expect(istFertig(baum, fertig), ausdruck).toBe(true);
        const muster = musterloesung(baum, belegung, 'java');
        expect(muster[muster.length - 1].zeile, ausdruck).toBe(String(werteAus(baum, belegung)));
      }
    }
  });
});

describe('Aufgabenerzeugung', () => {
  it('liefert bei gleichem Startwert dieselbe Aufgabe', () => {
    expect(erzeugeUebung(42, 2)).toEqual(erzeugeUebung(42, 2));
    expect(erzeugeAusdruck(42, 3)).toBe(erzeugeAusdruck(42, 3));
  });
  it('erzeugt gültige, abwechslungsreiche Ausdrücke', () => {
    const gesehen = new Set<string>();
    for (let startwert = 1; startwert <= 100; startwert++) {
      for (const stufe of [1, 2, 3] as const) {
        const text = erzeugeAusdruck(startwert, stufe);
        expect(() => parseLogik(text), text).not.toThrow();
        gesehen.add(text);
      }
    }
    expect(gesehen.size).toBeGreaterThan(40);
  });
  it('Stufe 2 stellt immer die Präzedenz-Falle', () => {
    for (let startwert = 1; startwert <= 100; startwert++) {
      const { ausdruck, belegung, falleAktiv } = erzeugeUebung(startwert, 2);
      expect(falleAktiv, ausdruck).toBe(true);
      const baum = parseLogik(ausdruck);
      expect(naivLinksNachRechts(baum, belegung), ausdruck).not.toBe(werteAus(baum, belegung));
    }
  });
});
