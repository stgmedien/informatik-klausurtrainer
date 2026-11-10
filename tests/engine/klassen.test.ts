import { describe, expect, it } from 'vitest';
import { type KlassenModell, ahnenreihe, besitz, pruefeModell, unterklassen } from '../../src/engine/klassen';

const modell: KlassenModell = {
  klassen: [
    { name: 'Actor', attribute: [{ name: 'x' }, { name: 'y' }, { name: 'rotation' }], methoden: [{ name: 'act' }, { name: 'getX' }] },
    { name: 'Spinne', ober: 'Actor', attribute: [{ name: 'fliegen' }], methoden: [{ name: 'schritt' }, { name: 'linksDrehen' }] },
    { name: 'Tarantel', ober: 'Spinne', attribute: [], methoden: [{ name: 'wenden' }, { name: 'act' }] },
    { name: 'Fliege', ober: 'Actor', attribute: [], methoden: [] },
  ],
};

describe('Vererbung', () => {
  it('erbt über mehrere Stufen (transitiv)', () => {
    expect(ahnenreihe(modell, 'Tarantel').map((k) => k.name)).toEqual(['Tarantel', 'Spinne', 'Actor']);
    const tarantel = besitz(modell, 'Tarantel');
    expect(tarantel.attribute.map((a) => a.name)).toEqual(['x', 'y', 'rotation', 'fliegen']);
    expect(tarantel.methoden.map((m) => m.name).sort()).toEqual(['act', 'getX', 'linksDrehen', 'schritt', 'wenden']);
  });
  it('vererbt nur nach unten, nie nach oben oder zur Seite', () => {
    expect(besitz(modell, 'Spinne').methoden.map((m) => m.name)).not.toContain('wenden');
    expect(besitz(modell, 'Fliege').methoden.map((m) => m.name)).not.toContain('schritt');
    expect(besitz(modell, 'Actor').attribute.map((a) => a.name)).toEqual(['x', 'y', 'rotation']);
  });
  it('kennzeichnet, woher ein Mitglied stammt', () => {
    const tarantel = besitz(modell, 'Tarantel');
    expect(tarantel.attribute.find((a) => a.name === 'fliegen')).toEqual({ name: 'fliegen', von: 'Spinne', geerbt: true });
    expect(tarantel.methoden.find((m) => m.name === 'wenden')).toEqual({ name: 'wenden', von: 'Tarantel', geerbt: false });
    // act() ist in Tarantel neu definiert und ersetzt die geerbte Fassung.
    expect(tarantel.methoden.find((m) => m.name === 'act')).toEqual({ name: 'act', von: 'Tarantel', geerbt: false });
  });
  it('findet direkte Unterklassen', () => {
    expect(unterklassen(modell, 'Actor').map((k) => k.name)).toEqual(['Spinne', 'Fliege']);
  });
});

describe('Modellprüfung', () => {
  it('akzeptiert ein sauberes Modell', () => expect(pruefeModell(modell)).toEqual([]));
  it('findet unbekannte Oberklasse, Kreis, doppelte und kleingeschriebene Namen', () => {
    expect(pruefeModell({ klassen: [{ name: 'A', ober: 'Z', attribute: [], methoden: [] }] })[0]).toContain('unbekannten Klasse');
    const kreis = pruefeModell({
      klassen: [
        { name: 'A', ober: 'B', attribute: [], methoden: [] },
        { name: 'B', ober: 'A', attribute: [], methoden: [] },
      ],
    });
    expect(kreis.some((f) => f.includes('im Kreis'))).toBe(true);
    expect(pruefeModell({ klassen: [{ name: 'auto', attribute: [], methoden: [] }] })[0]).toContain('Großbuchstaben');
  });
});
