import { describe, expect, it } from 'vitest';
import {
  MELDUNG_GEKLATSCHT,
  MELDUNG_HINDERNIS,
  MELDUNG_KEINE_FLIEGE,
  MELDUNG_NICHTS_GEFRESSEN,
  aktion,
  endzustand,
  feld,
  parseWelt,
  sensor,
  weltHash,
  weltZuText,
  type Welt,
} from '../../src/engine/welt';

/** Führt mehrere Aktionen nacheinander aus und liefert die letzte Welt. */
function nach(welt: Welt, ...namen: string[]): Welt {
  return namen.reduce((w, name) => aktion(w, name, []).welt, welt);
}

function karte(text: string): string {
  return text
    .split('\n')
    .map((z) => z.trim())
    .filter((z) => z !== '')
    .join('\n');
}

const KLEIN = `
  #####
  #...#
  #.>.#
  #...#
  #####`;

describe('Textkarte', () => {
  it('liest Größe, Felder und Spinne', () => {
    const w = parseWelt(`
      #######
      #..K..#
      #.>F3.#
      #..#.9#
      #######`);
    expect([w.breite, w.hoehe]).toEqual([7, 5]);
    expect(w.spinne).toEqual({ x: 2, y: 2, richtung: 0, gefressen: 0, geklatscht: false, nachrichten: true });
    expect(feld(w, 3, 1)).toEqual({ hindernis: false, klatsche: true, fliegen: 0 });
    expect(feld(w, 3, 2).fliegen).toBe(1);
    expect(feld(w, 4, 2).fliegen).toBe(3);
    expect(feld(w, 5, 3).fliegen).toBe(9);
    expect(feld(w, 3, 3).hindernis).toBe(true);
    expect(feld(w, 1, 1)).toEqual({ hindernis: false, klatsche: false, fliegen: 0 });
  });

  it.each([
    ['>', 0],
    ['v', 90],
    ['<', 180],
    ['^', 270],
  ] as const)('Spinnenzeichen %s bedeutet Rotation %i', (zeichen, richtung) => {
    expect(parseWelt(`###\n#${zeichen}#\n###`).spinne.richtung).toBe(richtung);
  });

  it('entfernt Leerzeilen am Rand und gemeinsame Einrückung', () => {
    const w = parseWelt('\n\n      ####\n      #>.#\n      ####   \n\n');
    expect(weltZuText(w)).toBe('####\n#>.#\n####');
  });

  it('übernimmt gefressene Fliegen und Fliegen unter der Spinne aus dem Zusatz', () => {
    const w = parseWelt(KLEIN, { gefressen: 4, fliegenUnterSpinne: 2 });
    expect(sensor(w, 'fliegenGefressen')).toBe(4);
    expect(sensor(w, 'fliegenAmPlatz')).toBe(2);
    expect(sensor(w, 'fliegeAmPlatz')).toBe(true);
  });

  it('Rundreise Text → Welt → Text ist verlustfrei', () => {
    const text = karte(`
      ########
      #.K.F..#
      #2.>.#9#
      #..3...#
      ########`);
    const w = parseWelt(text);
    expect(weltZuText(w)).toBe(text);
    expect(parseWelt(weltZuText(w))).toEqual(w);
    for (const zeichen of ['v', '<', '^']) {
      const gedreht = text.replace('>', zeichen);
      expect(weltZuText(parseWelt(gedreht))).toBe(gedreht);
    }
  });

  it('gibt die Welt nach Aktionen wieder als Karte aus', () => {
    const w = nach(parseWelt('######\n#>F.K#\n######'), 'schritt', 'fliegeFressen', 'schritt');
    expect(weltZuText(w)).toBe('######\n#..>K#\n######');
  });

  it.each([
    ['offener Rand oben', '#.###\n#.>.#\n#####', /Rand.*Zeile 1, Spalte 2/],
    ['offener Rand rechts', '#####\n#.>..\n#####', /Rand.*Zeile 2, Spalte 5/],
    ['Spinne auf dem Rand', '#####\n>...#\n#####', /Rand/],
    ['keine Spinne', '#####\n#...#\n#####', /fehlt die Spinne/],
    ['zwei Spinnen', '#####\n#>.<#\n#####', /nur eine Spinne/],
    ['ungleich lange Zeilen', '#####\n#.>#\n#####', /gleich lang.*Zeile 2 hat 4/],
    ['unbekanntes Zeichen', '#####\n#.>x#\n#####', /Unbekanntes Zeichen „x“ in Zeile 2, Spalte 4/],
    ['Ziffer 1 ist kein Feldzeichen', '#####\n#.>1#\n#####', /Unbekanntes Zeichen/],
    ['leere Karte', '  \n \n', /leer/],
    ['zu kleine Karte', '##\n##', /mindestens 3 × 3/],
  ])('meldet einen Fehler: %s', (_name, text, muster) => {
    expect(() => parseWelt(text)).toThrow(muster);
  });

  it('lehnt unsinnige Zusatzangaben ab', () => {
    expect(() => parseWelt(KLEIN, { gefressen: -1 })).toThrow(/gefressen/);
    expect(() => parseWelt(KLEIN, { fliegenUnterSpinne: 1.5 })).toThrow(/fliegenUnterSpinne/);
  });

  it('Felder außerhalb des Rasters gelten als Hindernis', () => {
    const w = parseWelt(KLEIN);
    for (const [x, y] of [
      [-1, 0],
      [0, -1],
      [5, 2],
      [2, 5],
      [99, 99],
    ]) {
      expect(feld(w, x, y)).toEqual({ hindernis: true, klatsche: false, fliegen: 0 });
    }
  });
});

describe('schritt()', () => {
  it.each([
    ['>', '#####\n#...#\n#.>.#\n#...#\n#####', 3, 2],
    ['v', '#####\n#...#\n#.v.#\n#...#\n#####', 2, 3],
    ['<', '#####\n#...#\n#.<.#\n#...#\n#####', 1, 2],
    ['^', '#####\n#...#\n#.^.#\n#...#\n#####', 2, 1],
  ])('geht mit Blick %s ein Feld in Blickrichtung (y wächst nach unten)', (_z, text, x, y) => {
    const r = aktion(parseWelt(text), 'schritt', []);
    expect(r).toMatchObject({ ok: true, welt: { spinne: { x, y, geklatscht: false } } });
    expect(r.meldung).toBeUndefined();
  });

  it('bleibt vor einem Hindernis stehen und meldet es', () => {
    const w = parseWelt('####\n#.>#\n####');
    const r = aktion(w, 'schritt', []);
    expect(r.ok).toBe(false);
    expect(r.meldung).toBe('Vor der Spinne liegt ein Hindernis.');
    expect(r.meldung).toBe(MELDUNG_HINDERNIS);
    expect(r.welt).toBe(w);
  });

  it('läuft auf eine Klatsche und ist danach geklatscht', () => {
    const r = aktion(parseWelt('#####\n#>K.#\n#####'), 'schritt', []);
    expect(r.ok).toBe(true);
    expect(r.meldung).toBe('Die Spinne wurde geklatscht.');
    expect(r.meldung).toBe(MELDUNG_GEKLATSCHT);
    expect(r.welt.spinne).toMatchObject({ x: 2, y: 1, geklatscht: true });
  });

  it('Hindernis schlägt Klatsche auf demselben Feld', () => {
    const w = parseWelt('#####\n#>K.#\n#####');
    const felder = w.felder.map((f, i) => (i === 1 * w.breite + 2 ? { hindernis: true, klatsche: true, fliegen: 0 } : f));
    const r = aktion({ ...w, felder }, 'schritt', []);
    expect(r.ok).toBe(false);
    expect(r.meldung).toBe(MELDUNG_HINDERNIS);
    expect(r.welt.spinne).toMatchObject({ x: 1, geklatscht: false });
  });

  it('lässt Fliegen auf dem betretenen Feld liegen', () => {
    const r = aktion(parseWelt('#####\n#>3.#\n#####'), 'schritt', []);
    expect(sensor(r.welt, 'fliegenAmPlatz')).toBe(3);
  });
});

describe('Drehen', () => {
  it('rechtsDrehen addiert 90, linksDrehen 270 (mod 360)', () => {
    let w = parseWelt(KLEIN);
    const rechts: number[] = [];
    for (let i = 0; i < 4; i++) {
      w = aktion(w, 'rechtsDrehen', []).welt;
      rechts.push(w.spinne.richtung);
    }
    expect(rechts).toEqual([90, 180, 270, 0]);
    const links: number[] = [];
    for (let i = 0; i < 4; i++) {
      w = aktion(w, 'linksDrehen', []).welt;
      links.push(w.spinne.richtung);
    }
    expect(links).toEqual([270, 180, 90, 0]);
  });

  it.each(['linksDrehen', 'rechtsDrehen'])('viermal %s ist die Identität', (name) => {
    const start = parseWelt('######\n#.F3.#\n#.v.K#\n######', { gefressen: 2 });
    const ende = nach(start, name, name, name, name);
    expect(ende).toEqual(start);
    expect(weltHash(ende)).toBe(weltHash(start));
    expect(endzustand(ende)).toEqual(endzustand(start));
  });

  it('links und rechts heben sich auf', () => {
    const start = parseWelt(KLEIN);
    expect(nach(start, 'linksDrehen', 'rechtsDrehen')).toEqual(start);
  });
});

describe('Fliegen', () => {
  it('fliegeFressen nimmt eine Fliege vom Platz', () => {
    const w = aktion(parseWelt('#####\n#>3.#\n#####'), 'schritt', []).welt;
    const r = aktion(w, 'fliegeFressen', []);
    expect(r.ok).toBe(true);
    expect(r.meldung).toBeUndefined();
    expect(sensor(r.welt, 'fliegenAmPlatz')).toBe(2);
    expect(sensor(r.welt, 'fliegenGefressen')).toBe(1);
  });

  it('fliegeFressen ohne Fliege meldet es und ändert nichts', () => {
    const w = parseWelt(KLEIN);
    const r = aktion(w, 'fliegeFressen', []);
    expect(r.ok).toBe(false);
    expect(r.meldung).toBe('Auf dem Platz liegt keine Fliege.');
    expect(r.meldung).toBe(MELDUNG_KEINE_FLIEGE);
    expect(r.welt).toBe(w);
  });

  it('fliegeAusspucken legt eine gefressene Fliege auf den Platz (stapelbar)', () => {
    const w = parseWelt(KLEIN, { gefressen: 2 });
    const r1 = aktion(w, 'fliegeAusspucken', []);
    const r2 = aktion(r1.welt, 'fliegeAusspucken', []);
    expect([r1.ok, r2.ok]).toEqual([true, true]);
    expect(sensor(r2.welt, 'fliegenAmPlatz')).toBe(2);
    expect(sensor(r2.welt, 'fliegenGefressen')).toBe(0);
    expect(sensor(r2.welt, 'fliegeGefressen')).toBe(false);
  });

  it('fliegeAusspucken ohne gefressene Fliege meldet es und ändert nichts', () => {
    const w = parseWelt(KLEIN);
    const r = aktion(w, 'fliegeAusspucken', []);
    expect(r.ok).toBe(false);
    expect(r.meldung).toBe('Die Spinne hat keine Fliege gefressen.');
    expect(r.meldung).toBe(MELDUNG_NICHTS_GEFRESSEN);
    expect(r.welt).toBe(w);
  });

  it('fliegenFuettern addiert ungeprüft – auch negative Zahlen', () => {
    const w = parseWelt(KLEIN, { gefressen: 1 });
    expect(aktion(w, 'fliegenFuettern', [10])).toMatchObject({ ok: true, welt: { spinne: { gefressen: 11 } } });
    expect(aktion(w, 'fliegenFuettern', [-5]).welt.spinne.gefressen).toBe(-4);
    expect(aktion(w, 'fliegenFuettern', [10]).meldung).toBeUndefined();
  });
});

describe('weitere eingebaute Methoden', () => {
  it('nachrichtenVerbergen schaltet die Konsolenmeldungen ab, nachrichtenZeigen wieder an', () => {
    const start = parseWelt('####\n#.>#\n####');
    const stumm = aktion(start, 'nachrichtenVerbergen', []);
    expect(stumm).toMatchObject({ ok: true, welt: { spinne: { nachrichten: false } } });
    for (const name of ['schritt', 'fliegeFressen', 'fliegeAusspucken']) {
      const r = aktion(stumm.welt, name, []);
      expect(r.ok).toBe(false);
      expect(r.meldung).toBeUndefined();
    }
    const laut = aktion(stumm.welt, 'nachrichtenZeigen', []).welt;
    expect(aktion(laut, 'schritt', []).meldung).toBe(MELDUNG_HINDERNIS);
  });

  it('auch die Klatsch-Meldung bleibt bei verborgenen Nachrichten aus', () => {
    const w = nach(parseWelt('#####\n#>K.#\n#####'), 'nachrichtenVerbergen');
    const r = aktion(w, 'schritt', []);
    expect(r.welt.spinne.geklatscht).toBe(true);
    expect(r.meldung).toBeUndefined();
  });

  it('tempo ändert den Weltzustand nicht', () => {
    const w = parseWelt(KLEIN);
    const r = aktion(w, 'tempo', [50]);
    expect(r).toEqual({ welt: w, ok: true });
  });

  it.each([0, 90, 180, 270])('setRotation(%i) setzt die Blickrichtung direkt', (rotation) => {
    const r = aktion(parseWelt(KLEIN), 'setRotation', [rotation]);
    expect(r.ok).toBe(true);
    expect(r.fehler).toBeUndefined();
    expect(r.welt.spinne.richtung).toBe(rotation);
  });

  it.each([45, 360, -90, 1])('setRotation(%i) ist ein Laufzeitfehler mit verständlicher Meldung', (rotation) => {
    const w = parseWelt(KLEIN);
    const r = aktion(w, 'setRotation', [rotation]);
    expect(r.ok).toBe(false);
    expect(r.welt).toBe(w);
    expect(r.fehler).toContain(`setRotation(${rotation})`);
    expect(r.fehler).toMatch(/0 \(Osten\), 90 \(Süden\), 180 \(Westen\) oder 270 \(Norden\)/);
  });

  it('getX, getY und getRotation liefern die Lage der Spinne', () => {
    const w = parseWelt('######\n#....#\n#..v.#\n######');
    expect([sensor(w, 'getX'), sensor(w, 'getY'), sensor(w, 'getRotation')]).toEqual([3, 2, 90]);
  });

  it('unbekannte Namen sind ein Programmierfehler des Aufrufers', () => {
    const w = parseWelt(KLEIN);
    expect(() => aktion(w, 'fliegen', [])).toThrow(/Unbekannte Aktion/);
    expect(() => sensor(w, 'hindernisHinten')).toThrow(/Unbekannte Abfrage/);
    expect(() => aktion(w, 'fliegenFuettern', [])).toThrow(/ganze Zahl/);
  });
});

describe('Sensoren', () => {
  // Norden: Hindernis, Osten: Klatsche, Süden: Fliege, Westen: frei.
  const umgebung = (spinne: string) => parseWelt(`#####\n#.#.#\n#.${spinne}K#\n#.F.#\n#####`);

  it.each([
    ['>', { hindernisVorn: false, klatscheVorn: true, fliegeVorn: false, hindernisRechts: false, hindernisLinks: true }],
    ['v', { hindernisVorn: false, klatscheVorn: false, fliegeVorn: true, hindernisRechts: false, hindernisLinks: false }],
    ['<', { hindernisVorn: false, klatscheVorn: false, fliegeVorn: false, hindernisRechts: true, hindernisLinks: false }],
    ['^', { hindernisVorn: true, klatscheVorn: false, fliegeVorn: false, hindernisRechts: false, hindernisLinks: false }],
  ])('Blick %s: vorn/rechts/links beziehen sich auf die Blickrichtung', (spinne, erwartet) => {
    const w = umgebung(spinne);
    for (const [name, wert] of Object.entries(erwartet)) expect([name, sensor(w, name)]).toEqual([name, wert]);
  });

  it.each([
    ['ohne Fliegen', {}, { fliegeAmPlatz: false, fliegenAmPlatz: 0, fliegeGefressen: false, fliegenGefressen: 0 }],
    ['eine am Platz', { fliegenUnterSpinne: 1 }, { fliegeAmPlatz: true, fliegenAmPlatz: 1, fliegeGefressen: false, fliegenGefressen: 0 }],
    ['drei gefressen', { gefressen: 3 }, { fliegeAmPlatz: false, fliegenAmPlatz: 0, fliegeGefressen: true, fliegenGefressen: 3 }],
    [
      'beides',
      { gefressen: 1, fliegenUnterSpinne: 5 },
      { fliegeAmPlatz: true, fliegenAmPlatz: 5, fliegeGefressen: true, fliegenGefressen: 1 },
    ],
  ])('Fliegen-Zwillinge: %s', (_name, zusatz, erwartet) => {
    const w = parseWelt(KLEIN, zusatz);
    for (const [name, wert] of Object.entries(erwartet)) expect([name, sensor(w, name)]).toEqual([name, wert]);
  });

  it('der Rand zählt als Hindernis in alle Richtungen', () => {
    const w = parseWelt('###\n#>#\n###');
    expect([sensor(w, 'hindernisVorn'), sensor(w, 'hindernisRechts'), sensor(w, 'hindernisLinks')]).toEqual([true, true, true]);
  });
});

describe('geklatschte Spinne', () => {
  // Nach dem Schritt steht die Spinne geklatscht zwischen Hindernis (Norden), Klatsche (Osten) und Fliege (Süden).
  const start = parseWelt('######\n#..#.#\n#.>KK#\n#..F.#\n######', { gefressen: 3 });
  const geklatscht = aktion(start, 'schritt', []).welt;

  it('ist nach dem Schritt auf die Klatsche geklatscht', () => {
    expect(geklatscht.spinne).toMatchObject({ x: 3, y: 2, geklatscht: true, gefressen: 3 });
  });

  it.each([
    ['schritt', []],
    ['linksDrehen', []],
    ['rechtsDrehen', []],
    ['fliegeFressen', []],
    ['fliegeAusspucken', []],
    ['fliegenFuettern', [7]],
    ['nachrichtenVerbergen', []],
    ['nachrichtenZeigen', []],
  ] as [string, number[]][])('%s ist wirkungslos und meldet nichts', (name, args) => {
    const r = aktion(geklatscht, name, args);
    expect(r.ok).toBe(false);
    expect(r.meldung).toBeUndefined();
    expect(r.welt).toBe(geklatscht);
  });

  it('boolean-Sensoren liefern false, int-Sensoren 0', () => {
    // Zur Kontrolle: Dieselbe Lage ohne Klatschen liefert sehr wohl true bzw. Zahlen.
    const lebendig = { ...geklatscht, spinne: { ...geklatscht.spinne, geklatscht: false } };
    expect(sensor(lebendig, 'hindernisLinks')).toBe(true);
    expect(sensor(lebendig, 'klatscheVorn')).toBe(true);
    expect(sensor(lebendig, 'fliegeGefressen')).toBe(true);
    expect(sensor(lebendig, 'fliegenGefressen')).toBe(3);

    for (const name of ['hindernisVorn', 'hindernisRechts', 'hindernisLinks', 'klatscheVorn', 'fliegeVorn', 'fliegeAmPlatz', 'fliegeGefressen']) {
      expect([name, sensor(geklatscht, name)]).toEqual([name, false]);
    }
    expect(sensor(geklatscht, 'fliegenAmPlatz')).toBe(0);
    expect(sensor(geklatscht, 'fliegenGefressen')).toBe(0);
  });

  it('die Position bleibt abfragbar', () => {
    expect([sensor(geklatscht, 'getX'), sensor(geklatscht, 'getY'), sensor(geklatscht, 'getRotation')]).toEqual([3, 2, 0]);
  });

  it('der Endzustand meldet lebt = false', () => {
    expect(endzustand(geklatscht)).toMatchObject({ lebt: false, x: 3, y: 2 });
    expect(endzustand(start).lebt).toBe(true);
  });
});

describe('Unveränderlichkeit', () => {
  it('jede Aktion liefert eine neue Welt, alte Zustände bleiben unverändert', () => {
    const start = parseWelt('#######\n#>F2.K#\n#######', { gefressen: 1 });
    const urbild = JSON.stringify(start);
    const zustaende: Welt[] = [start];
    const abbilder: string[] = [urbild];
    const folge = ['fliegeAusspucken', 'schritt', 'fliegeFressen', 'linksDrehen', 'rechtsDrehen', 'schritt', 'fliegeFressen', 'fliegeFressen', 'schritt', 'schritt'];
    for (const name of folge) {
      const neu = aktion(zustaende[zustaende.length - 1], name, name === 'fliegenFuettern' ? [1] : []).welt;
      zustaende.push(neu);
      abbilder.push(JSON.stringify(neu));
    }
    zustaende.forEach((w, i) => expect(JSON.stringify(w)).toBe(abbilder[i]));
    expect(JSON.stringify(start)).toBe(urbild);
    expect(zustaende[zustaende.length - 1].spinne.geklatscht).toBe(true);
    expect(new Set(zustaende).size).toBe(zustaende.length);
  });

  it('Welt und Spinne sind eingefroren', () => {
    const start = parseWelt(KLEIN, { gefressen: 1 });
    const danach = aktion(start, 'fliegeAusspucken', []).welt;
    for (const w of [start, danach]) {
      expect(Object.isFrozen(w)).toBe(true);
      expect(Object.isFrozen(w.spinne)).toBe(true);
      expect(w.felder.every((f) => Object.isFrozen(f))).toBe(true);
    }
    expect(Object.isFrozen(start.felder)).toBe(true);
  });

  it('teilt unveränderte Teile zwischen den Zuständen', () => {
    const start = parseWelt(KLEIN);
    expect(aktion(start, 'schritt', []).welt.felder).toBe(start.felder);
    expect(aktion(start, 'linksDrehen', []).welt.felder).toBe(start.felder);
  });
});

describe('weltHash und endzustand', () => {
  it('gleiche Zustände haben denselben Hash, egal auf welchem Weg sie entstanden sind', () => {
    const start = parseWelt('######\n#>F..#\n######');
    const a = nach(start, 'schritt', 'fliegeFressen', 'fliegeAusspucken', 'rechtsDrehen', 'rechtsDrehen', 'schritt', 'linksDrehen', 'linksDrehen');
    expect(a).toEqual(start);
    expect(weltHash(a)).toBe(weltHash(start));
    expect(weltHash(parseWelt('######\n#>F..#\n######'))).toBe(weltHash(start));
  });

  it('jeder Unterschied im Zustand ändert den Hash', () => {
    const start = parseWelt('######\n#>F.K#\n######', { gefressen: 1 });
    const varianten = [
      start,
      nach(start, 'schritt'),
      nach(start, 'linksDrehen'),
      nach(start, 'fliegeAusspucken'),
      nach(start, 'nachrichtenVerbergen'),
      aktion(start, 'fliegenFuettern', [1]).welt,
      nach(start, 'schritt', 'fliegeFressen'),
      nach(start, 'schritt', 'schritt', 'schritt'),
      parseWelt('######\n#>F..#\n######', { gefressen: 1 }),
      parseWelt('######\n#>F#K#\n######', { gefressen: 1 }),
      parseWelt('#######\n#>F.K.#\n#######', { gefressen: 1 }),
    ];
    expect(new Set(varianten.map(weltHash)).size).toBe(varianten.length);
  });

  it('der Hash stimmt auch nach vielen Fliegen-Änderungen mit einer frisch gelesenen Welt überein', () => {
    let w = parseWelt('#####\n#>..#\n#...#\n#####', { gefressen: 5 });
    weltHash(w);
    w = nach(w, 'fliegeAusspucken', 'schritt', 'fliegeAusspucken', 'fliegeAusspucken', 'rechtsDrehen', 'schritt', 'fliegeAusspucken');
    const frisch = { ...parseWelt('#####\n#F2.#\n#.v.#\n#####', { gefressen: 1, fliegenUnterSpinne: 1 }) };
    expect(weltZuText(w)).toBe('#####\n#F2.#\n#.v.#\n#####');
    expect(weltHash(w)).toBe(weltHash(frisch));
  });

  it('endzustand fasst Lage, Bauch und alle Fliegenfelder kanonisch zusammen', () => {
    const start = parseWelt('######\n#>F3.#\n#..9.#\n######', { gefressen: 2 });
    expect(endzustand(start)).toEqual({ x: 1, y: 1, richtung: 0, gefressen: 2, lebt: true, fliegen: '2,1:1;3,1:3;3,2:9' });
    const ende = nach(start, 'fliegeAusspucken', 'schritt', 'fliegeFressen', 'rechtsDrehen');
    expect(endzustand(ende)).toEqual({ x: 2, y: 1, richtung: 90, gefressen: 2, lebt: true, fliegen: '1,1:1;3,1:3;3,2:9' });
  });
});
