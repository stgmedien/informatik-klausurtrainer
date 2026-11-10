import { describe, expect, it } from 'vitest';
import { fuehreAus, parse, type Ereignis, type Lauf, type Programm, type Schritt, type Wert } from '../../src/engine/java';
import { MELDUNG_HINDERNIS, MELDUNG_KEINE_FLIEGE, endzustand, parseWelt, weltZuText, type Welt } from '../../src/engine/welt';

/** Klassenrahmen: der Rumpf beginnt in Zeile 3. */
const K = (rumpf: string): string => `public class Tarantel extends Spinne\n{\n${rumpf}\n}\n`;

function programm(rumpf: string, erlaubteWarnungen: string[] = []): Programm {
  const e = parse(K(rumpf));
  expect(e.diagnosen.filter((d) => !erlaubteWarnungen.includes(d.code))).toEqual([]);
  return e.programm!;
}

/** Eine Methode `test` mit den angegebenen Anweisungen (ab Zeile 5). */
function test1(...zeilen: string[]): string {
  return `    public void test()\n    {\n${zeilen.map((z) => `        ${z}`).join('\n')}\n    }`;
}

const FLUR = parseWelt('#######\n#>....#\n#######');
const KAMMER = parseWelt('#####\n#...#\n#.>.#\n#...#\n#####');

function arten(lauf: Lauf): string[] {
  return lauf.schritte.map((s) => s.ereignis.art);
}

function wert(p: Programm, methode: string, args: Wert[] = [], welt: Welt = KAMMER): Wert | undefined {
  const lauf = fuehreAus(p, methode, args, welt);
  expect(lauf.ende).toEqual({ art: 'ende', grund: 'fertig' });
  return lauf.rueckgabe;
}

function ereignisse<A extends Ereignis['art']>(lauf: Lauf, art: A): Extract<Ereignis, { art: A }>[] {
  return lauf.schritte.map((s) => s.ereignis).filter((e): e is Extract<Ereignis, { art: A }> => e.art === art);
}

describe('Ereignisse und Schritte', () => {
  const p = programm(
    [
      '    public void test()', // 3
      '    {',
      '        schritt();', // 5
      '        if (hindernisVorn())', // 6
      '        {',
      '            linksDrehen();', // 8
      '        }',
      '        wenden();', // 10
      '    }', // 11
      '    private void wenden()', // 12
      '    {',
      '        rechtsDrehen();', // 14
      '        rechtsDrehen();', // 15
      '    }', // 16
    ].join('\n'),
  );
  const lauf = fuehreAus(p, 'test', [], FLUR);

  it('zeichnet jeden Schritt mit Art, Zeile und Aufruftiefe auf', () => {
    expect(lauf.schritte.map((s) => [s.ereignis.art, s.zeile, s.tiefe])).toEqual([
      ['aufruf', 3, 0],
      ['aktion', 5, 1],
      ['bedingung', 6, 1],
      ['aufruf', 10, 1],
      ['aktion', 14, 2],
      ['aktion', 15, 2],
      ['rueckkehr', 16, 2],
      ['rueckkehr', 11, 1],
      ['ende', 11, 0],
    ]);
    expect(lauf.schritte.map((s) => s.nr)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(lauf.ende).toEqual({ art: 'ende', grund: 'fertig' });
    expect(lauf.schritte[8].ereignis).toBe(lauf.ende);
    expect(lauf.rueckgabe).toBeUndefined();
  });

  it('die Ereignisse tragen die passenden Daten und verweisen auf Knoten des Programms', () => {
    const [start, aktion, bedingung, aufruf, , , rueck] = lauf.schritte.map((s) => s.ereignis);
    expect(start).toMatchObject({ art: 'aufruf', methode: 'test', args: [] });
    expect(aktion).toMatchObject({ art: 'aktion', name: 'schritt', ok: true });
    expect(bedingung).toMatchObject({ art: 'bedingung', wert: false, teile: [{ text: 'hindernisVorn()', wert: false }] });
    expect(aufruf).toMatchObject({ art: 'aufruf', methode: 'wenden', args: [] });
    expect(rueck).toMatchObject({ art: 'rueckkehr', methode: 'wenden' });

    const knotenArt = (e: Ereignis): string | undefined => (e.art === 'ende' ? undefined : p.knoten.get(e.knoten)?.art);
    expect(lauf.schritte.map((s) => knotenArt(s.ereignis))).toEqual(['Methode', 'AufrufAnw', 'Wenn', 'AufrufAnw', 'AufrufAnw', 'AufrufAnw', 'Methode', 'Methode', undefined]);
    if (bedingung.art === 'bedingung') expect(p.knoten.get(bedingung.teile[0].knoten)).toMatchObject({ art: 'Aufruf', name: 'hindernisVorn' });
  });

  it('jeder Schritt enthält den Zustand nach dem Ereignis', () => {
    expect(lauf.schritte[0].welt).toBe(FLUR);
    expect(lauf.schritte.map((s) => `${s.welt.spinne.x}/${s.welt.spinne.richtung}`)).toEqual(['1/0', '2/0', '2/0', '2/0', '2/90', '2/180', '2/180', '2/180', '2/180']);
    expect(lauf.endwelt).toBe(lauf.schritte[8].welt);
    expect(lauf.schritte.map((s) => s.rahmen.map((r) => r.methode))).toEqual([[], ['test'], ['test'], ['test'], ['test', 'wenden'], ['test', 'wenden'], ['test', 'wenden'], ['test'], []]);
    expect(lauf.zaehler).toEqual({ schritt: 1, rechtsDrehen: 2 });
    expect(lauf.konsole).toEqual([]);
  });

  it('mit der Tiefe lässt sich ein Methodenaufruf überspringen', () => {
    const i = lauf.schritte.findIndex((s) => s.ereignis.art === 'aufruf' && s.tiefe === 1);
    const weiter = lauf.schritte.find((s) => s.nr > i && s.tiefe <= 1)!;
    expect(weiter.ereignis.art).toBe('rueckkehr');
    expect(weiter.zeile).toBe(11);
    expect(weiter.welt.spinne.richtung).toBe(180);
  });

  it('ohne Aufzeichnung bleiben die Schritte leer, das Ergebnis ist dasselbe', () => {
    const stumm = fuehreAus(p, 'test', [], FLUR, { aufzeichnen: false });
    expect(stumm.schritte).toEqual([]);
    expect(stumm.ende).toEqual(lauf.ende);
    expect(stumm.zaehler).toEqual(lauf.zaehler);
    expect(endzustand(stumm.endwelt)).toEqual(endzustand(lauf.endwelt));
  });
});

describe('Bedingungen: Teilausdrücke in Auswertungsreihenfolge', () => {
  const p = programm(
    [
      '    public boolean pruefe(int a, boolean b)',
      '    {',
      '        if (a + 1 > 3 || !b)',
      '        {',
      '            return true;',
      '        }',
      '        return false;',
      '    }',
      test1('while (!klatscheVorn() && !(hindernisVorn()))', '{', '    schritt();', '}'),
    ].join('\n'),
  );

  it('listet jeden ausgewerteten Teilausdruck mit Quelltext und Wert', () => {
    const lauf = fuehreAus(p, 'pruefe', [1, false], KAMMER);
    expect(ereignisse(lauf, 'bedingung')[0].teile.map((t) => [t.text, t.wert])).toEqual([
      ['a', 1],
      ['a + 1', 2],
      ['a + 1 > 3', false],
      ['b', false],
      ['!b', true],
      ['a + 1 > 3 || !b', true],
    ]);
    expect(lauf.rueckgabe).toBe(true);
  });

  it('lässt bei Kurzschluss die nicht ausgewertete Seite weg', () => {
    const lauf = fuehreAus(p, 'pruefe', [5, true], KAMMER);
    expect(ereignisse(lauf, 'bedingung')[0].teile.map((t) => t.text)).toEqual(['a', 'a + 1', 'a + 1 > 3', 'a + 1 > 3 || !b']);
    expect(fuehreAus(p, 'pruefe', [0, true], KAMMER).rueckgabe).toBe(false);
  });

  it('zeigt bei Sensoren, warum eine Schleife endet', () => {
    const lauf = fuehreAus(p, 'test', [], parseWelt('######\n#>.K.#\n######'));
    const bedingungen = ereignisse(lauf, 'bedingung');
    expect(bedingungen.map((b) => b.wert)).toEqual([true, false]);
    expect(bedingungen[0].teile.map((t) => [t.text, t.wert])).toEqual([
      ['klatscheVorn()', false],
      ['!klatscheVorn()', true],
      ['hindernisVorn()', false],
      ['!(hindernisVorn())', true],
      ['!klatscheVorn() && !(hindernisVorn())', true],
    ]);
    expect(bedingungen[1].teile.map((t) => [t.text, t.wert])).toEqual([
      ['klatscheVorn()', true],
      ['!klatscheVorn()', false],
      ['!klatscheVorn() && !(hindernisVorn())', false],
    ]);
    expect(lauf.endwelt.spinne).toMatchObject({ x: 2, geklatscht: false });
  });
});

describe('Kurzschluss bei && und ||', () => {
  const p = programm(
    [
      '    private int aufrufe = 0;',
      '',
      '    private boolean merke(boolean antwort)',
      '    {',
      '        aufrufe++;',
      '        linksDrehen();',
      '        return antwort;',
      '    }',
      '    public int undKurz() { if (merke(false) && merke(true)) { schritt(); } return aufrufe; }',
      '    public int undVoll() { if (merke(true) && merke(false)) { schritt(); } return aufrufe; }',
      '    public int oderKurz() { if (merke(true) || merke(false)) { schritt(); } return aufrufe; }',
      '    public int oderVoll() { if (merke(false) || merke(true)) { schritt(); } return aufrufe; }',
      '    public int ohneKurzschluss() { if (merke(false) & merke(true)) { schritt(); } return aufrufe; }',
      '    public int ohneKurzschlussOder() { if (merke(true) | merke(false)) { schritt(); } return aufrufe; }',
    ].join('\n'),
    ['und-oder-einfach'],
  );

  it.each([
    ['undKurz', 1, 270, false],
    ['undVoll', 2, 180, false],
    ['oderKurz', 1, 270, true],
    ['oderVoll', 2, 180, true],
    ['ohneKurzschluss', 2, 180, false],
    ['ohneKurzschlussOder', 2, 180, true],
  ])('%s wertet %i Seite(n) aus', (methode, aufrufe, richtung, geschritten) => {
    const lauf = fuehreAus(p, methode, [], KAMMER);
    expect(lauf.rueckgabe).toBe(aufrufe);
    // Die eigene boolean-Methode dreht die Spinne: Am Ende sieht man, wie oft sie wirklich lief.
    expect(lauf.endwelt.spinne.richtung).toBe(richtung);
    expect(lauf.zaehler.linksDrehen).toBe(aufrufe);
    expect(lauf.zaehler.schritt === 1).toBe(geschritten);
  });

  it('die Aufrufe in der Bedingung erscheinen als eigene Schritte vor dem Bedingungs-Ereignis', () => {
    const lauf = fuehreAus(p, 'undKurz', [], KAMMER);
    expect(arten(lauf)).toEqual(['aufruf', 'aufruf', 'variable', 'aktion', 'rueckkehr', 'bedingung', 'rueckkehr', 'ende']);
    expect(ereignisse(lauf, 'aufruf')[1]).toMatchObject({ methode: 'merke', args: [false] });
    expect(ereignisse(lauf, 'rueckkehr')[0]).toMatchObject({ methode: 'merke', wert: false });
    expect(ereignisse(lauf, 'bedingung')[0].teile.map((t) => [t.text, t.wert])).toEqual([
      ['merke(false)', false],
      ['merke(false) && merke(true)', false],
    ]);
  });
});

describe('Rechnen wie Java', () => {
  const p = programm(
    [
      '    public int durch(int a, int b) { return a / b; }',
      '    public int rest(int a, int b) { return a % b; }',
      '    public int plus(int a, int b) { return a + b; }',
      '    public int minus(int a, int b) { return a - b; }',
      '    public int mal(int a, int b) { return a * b; }',
      '    public int negativ(int a) { return -a; }',
      '    public int vorrang() { return 2 + 3 * 4 - (2 + 3) * 4 / 3; }',
      '    public int kleinste() { return -2147483648; }',
      '    public int zusammengesetzt(int a) { a += 5; a -= 2; a++; a--; ++a; --a; return a; }',
      '    public boolean vergleiche(int a, int b) { return a < b == (b > a) && a <= b != (a >= b + 1) && (a == b || a != b); }',
    ].join('\n'),
  );

  it.each([
    ['durch', [7, 2], 3],
    ['durch', [-7, 2], -3],
    ['durch', [7, -2], -3],
    ['durch', [-7, -2], 3],
    ['durch', [1, 3], 0],
    ['durch', [-2147483648, -1], -2147483648],
    ['rest', [7, 2], 1],
    ['rest', [-7, 2], -1],
    ['rest', [7, -2], 1],
    ['rest', [-4, 2], 0],
    ['plus', [2147483647, 1], -2147483648],
    ['minus', [-2147483648, 1], 2147483647],
    ['mal', [46341, 46341], -2147479015],
    ['mal', [65536, 65536], 0],
    ['negativ', [5], -5],
    ['negativ', [-2147483648], -2147483648],
    ['negativ', [0], 0],
    ['vorrang', [], 8],
    ['kleinste', [], -2147483648],
    ['zusammengesetzt', [10], 13],
    ['vergleiche', [1, 2], true],
  ] as [string, number[], Wert][])('%s(%j) = %j', (methode, args, erwartet) => {
    const ergebnis = wert(p, methode, args);
    expect(ergebnis).toBe(erwartet);
    expect(Object.is(ergebnis, -0)).toBe(false);
  });

  it.each(['durch', 'rest'])('%s durch 0 ist ein Laufzeitfehler', (methode) => {
    const lauf = fuehreAus(p, methode, [5, 0], KAMMER);
    expect(lauf.ende.grund).toBe('laufzeitfehler');
    expect(lauf.ende.text).toMatch(/^Division durch 0 in Zeile \d+: `a [/%] b`/);
    expect(lauf.ende.text).toContain('/ by zero');
    expect(lauf.rueckgabe).toBeUndefined();
    const letzter = lauf.schritte[lauf.schritte.length - 1];
    expect(letzter.ereignis).toBe(lauf.ende);
    expect(letzter.tiefe).toBe(1);
  });
});

describe('Gültigkeitsbereiche', () => {
  const p = programm(
    [
      '    public int bereiche(int n)', // 3
      '    {',
      '        int summe = 0;', // 5
      '        for (int i = 0; i < n; i++)', // 6
      '        {',
      '            int doppelt = i * 2;', // 8
      '            summe = summe + doppelt;', // 9
      '        }',
      '        for (int i = 10; i > 8; i--)', // 11
      '        {',
      '            summe += i;', // 13
      '        }',
      '        {',
      '            int nurHier = 1;', // 16
      '            summe = summe + nurHier;',
      '        }',
      '        int spaeter;', // 19
      '        spaeter = summe;', // 20
      '        return spaeter;', // 21
      '    }',
    ].join('\n'),
  );
  const lauf = fuehreAus(p, 'bereiche', [3], KAMMER);
  const namen = (s: Schritt): string => s.rahmen[s.rahmen.length - 1].variablen.map((v) => `${v.name}=${String(v.wert)}`).join(' ');

  it('rechnet richtig', () => {
    expect(lauf.rueckgabe).toBe(26);
  });

  it('die for-Variable und Blockvariablen leben nur in ihrem Block', () => {
    const inErsterSchleife = lauf.schritte.find((s) => s.zeile === 9)!;
    expect(namen(inErsterSchleife)).toBe('n=3 summe=0 i=0 doppelt=0');
    const zweiteSchleife = lauf.schritte.find((s) => s.zeile === 13)!;
    expect(namen(zweiteSchleife)).toBe('n=3 summe=16 i=10');
    const imBlock = lauf.schritte.find((s) => s.zeile === 16)!;
    expect(namen(imBlock)).toBe('n=3 summe=25 nurHier=1');
    const amEnde = lauf.schritte.find((s) => s.zeile === 21)!;
    expect(namen(amEnde)).toBe('n=3 summe=26 spaeter=26');
    expect(amEnde.rahmen[0].variablen.map((v) => v.typ)).toEqual(['int', 'int', 'int']);
  });

  it('meldet Variablen als neu, wenn sie zum ersten Mal einen Wert bekommen', () => {
    const variablen = ereignisse(lauf, 'variable');
    expect(variablen.slice(0, 4).map((v) => [v.name, v.wert, v.neu])).toEqual([
      ['summe', 0, true],
      ['i', 0, true],
      ['doppelt', 0, true],
      ['summe', 0, false],
    ]);
    // `int spaeter;` ohne Startwert ist nur eine Anweisung; sichtbar wird die Variable mit der ersten Zuweisung.
    const dekl = lauf.schritte.find((s) => s.zeile === 19)!;
    expect(dekl.ereignis.art).toBe('anweisung');
    expect(namen(dekl)).toBe('n=3 summe=26');
    expect(variablen[variablen.length - 1]).toMatchObject({ name: 'spaeter', wert: 26, neu: true });
  });

  it('eine lokale Variable verdeckt ein gleichnamiges Attribut; this.name meint das Attribut', () => {
    const q = programm(
      [
        '    private int wert = 7;',
        '    public int lokal() { int wert = 1; wert = wert + 1; return wert; }',
        '    public int attribut() { int wert = 1; this.wert = this.wert + wert; return this.wert; }',
        '    public int danach() { { int wert = 1; wert++; } return wert; }',
        '    public int parameter(int wert) { wert = wert * 2; return wert + this.wert; }',
      ].join('\n'),
    );
    expect(wert(q, 'lokal')).toBe(2);
    expect(wert(q, 'attribut')).toBe(8);
    expect(wert(q, 'danach')).toBe(7);
    expect(wert(q, 'parameter', [10])).toBe(27);
  });

  it('jeder Aufruf hat seine eigenen Variablen', () => {
    const q = programm(
      [
        '    public int fakultaet(int n)',
        '    {',
        '        if (n <= 1)',
        '        {',
        '            return 1;',
        '        }',
        '        int rest = fakultaet(n - 1);',
        '        return n * rest;',
        '    }',
      ].join('\n'),
    );
    const l = fuehreAus(q, 'fakultaet', [4], KAMMER);
    expect(l.rueckgabe).toBe(24);
    const tiefster = l.schritte.reduce((a, b) => (b.tiefe > a.tiefe ? b : a));
    expect(tiefster.tiefe).toBe(4);
    expect(tiefster.rahmen.map((r) => `${r.methode}(${r.variablen.map((v) => v.wert).join(',')})`)).toEqual(['fakultaet(4)', 'fakultaet(3)', 'fakultaet(2)', 'fakultaet(1)']);
    expect(ereignisse(l, 'rueckkehr').map((r) => r.wert)).toEqual([1, 2, 6, 24]);
    expect(wert(q, 'fakultaet', [13])).toBe(1932053504);
  });
});

describe('Schleifen und return', () => {
  it('return verlässt beliebig tief verschachtelte Schleifen sofort', () => {
    const p = programm(
      [
        '    public int suche(int ziel)', // 3
        '    {',
        '        int runde = 0;',
        '        while (true)',
        '        {',
        '            for (int i = 0; i < 10; i++)',
        '            {',
        '                do',
        '                {',
        '                    if (runde * 10 + i == ziel)',
        '                    {',
        '                        schritt();',
        '                        return runde * 10 + i;', // 15
        '                    }',
        '                }',
        '                while (false);',
        '            }',
        '            runde++;',
        '        }',
        '    }',
      ].join('\n'),
    );
    const lauf = fuehreAus(p, 'suche', [23], FLUR);
    expect(lauf.ende.grund).toBe('fertig');
    expect(lauf.rueckgabe).toBe(23);
    const [vorletzter, letzter] = lauf.schritte.slice(-2);
    expect(vorletzter).toMatchObject({ zeile: 15, tiefe: 1, ereignis: { art: 'rueckkehr', methode: 'suche', wert: 23 } });
    expect(letzter).toMatchObject({ tiefe: 0, ereignis: { art: 'ende', grund: 'fertig' } });
    expect(lauf.zaehler).toEqual({ schritt: 1 });
    expect(wert(p, 'suche', [0])).toBe(0);
  });

  it('return ohne Wert beendet eine void-Methode mitten in der Schleife', () => {
    const p = programm(test1('while (!hindernisVorn())', '{', '    schritt();', '    if (fliegeAmPlatz())', '    {', '        return;', '    }', '}', 'linksDrehen();'));
    const mitFliege = fuehreAus(p, 'test', [], parseWelt('#######\n#>.F..#\n#######'));
    expect(endzustand(mitFliege.endwelt)).toMatchObject({ x: 3, richtung: 0 });
    expect(ereignisse(mitFliege, 'rueckkehr')).toHaveLength(1);
    expect(ereignisse(mitFliege, 'rueckkehr')[0].wert).toBeUndefined();
    const ohne = fuehreAus(p, 'test', [], FLUR);
    expect(endzustand(ohne.endwelt)).toMatchObject({ x: 5, richtung: 270 });
  });

  it('do-while läuft mindestens einmal, while unter Umständen nie', () => {
    const p = programm(
      [
        '    public int fussgesteuert() { int n = 0; do { n++; linksDrehen(); } while (hindernisVorn()); return n; }',
        '    public int kopfgesteuert() { int n = 0; while (hindernisVorn()) { n++; linksDrehen(); } return n; }',
      ].join('\n'),
    );
    expect(wert(p, 'fussgesteuert')).toBe(1);
    expect(wert(p, 'kopfgesteuert')).toBe(0);
    // Vor der Wand drehen beide zweimal, bis der Weg frei ist.
    const wand = parseWelt('####\n#.>#\n####');
    expect(wert(p, 'fussgesteuert', [], wand)).toBe(2);
    expect(wert(p, 'kopfgesteuert', [], wand)).toBe(2);
    const lauf = fuehreAus(p, 'fussgesteuert', [], KAMMER);
    expect(arten(lauf)).toEqual(['aufruf', 'variable', 'variable', 'aktion', 'bedingung', 'rueckkehr', 'ende']);
  });

  it('die Bedingung einer do-while-Schleife meldet die Zeile des while', () => {
    const p = programm(test1('do', '{', '    schritt();', '}', 'while (!hindernisVorn());'));
    const lauf = fuehreAus(p, 'test', [], parseWelt('#####\n#>..#\n#####'));
    expect(lauf.schritte.map((s) => [s.ereignis.art, s.zeile])).toEqual([
      ['aufruf', 3],
      ['aktion', 7],
      ['bedingung', 9],
      ['aktion', 7],
      ['bedingung', 9],
      ['rueckkehr', 10],
      ['ende', 10],
    ]);
    expect(p.knoten.get(ereignisse(lauf, 'bedingung')[0].knoten)!.art).toBe('Wiederhole');
  });

  it('die Zählschleife durchläuft Start, Bedingung, Rumpf, Schritt in dieser Reihenfolge', () => {
    const p = programm(test1('for (int i = 0; i < 2; i++)', '{', '    schritt();', '}'));
    const lauf = fuehreAus(p, 'test', [], FLUR);
    expect(lauf.schritte.map((s) => [s.ereignis.art, s.zeile])).toEqual([
      ['aufruf', 3],
      ['variable', 5],
      ['bedingung', 5],
      ['aktion', 7],
      ['variable', 5],
      ['bedingung', 5],
      ['aktion', 7],
      ['variable', 5],
      ['bedingung', 5],
      ['rueckkehr', 9],
      ['ende', 9],
    ]);
    expect(ereignisse(lauf, 'variable').map((v) => [v.wert, v.neu])).toEqual([
      [0, true],
      [1, false],
      [2, false],
    ]);
    expect(ereignisse(lauf, 'bedingung').map((b) => b.wert)).toEqual([true, true, false]);
    expect(lauf.endwelt.spinne.x).toBe(3);
  });

  it('eine leere Anweisung und ein Sensor als Anweisung sind eigene Schritte ohne Wirkung', () => {
    const p = programm(test1(';', 'hindernisVorn();', 'schritt();'), ['ergebnis-unbenutzt']);
    const lauf = fuehreAus(p, 'test', [], FLUR);
    expect(arten(lauf)).toEqual(['aufruf', 'anweisung', 'anweisung', 'aktion', 'rueckkehr', 'ende']);
    expect(lauf.zaehler).toEqual({ schritt: 1 });
  });
});

describe('Rekursion', () => {
  const p = programm(
    [
      '    public int tief(int n) { if (n == 0) { return 0; } return 1 + tief(n - 1); }',
      '    public void endlos() { endlos(); }',
      '    public void ping() { pong(); }',
      '    public void pong() { ping(); }',
      '    public void wandern() { if (!hindernisVorn()) { schritt(); wandern(); } }',
    ].join('\n'),
  );

  it('endliche Rekursion funktioniert bis zur Tiefe 500', () => {
    expect(wert(p, 'tief', [10])).toBe(10);
    expect(wert(p, 'tief', [499])).toBe(499);
    const lauf = fuehreAus(p, 'wandern', [], FLUR);
    expect(lauf.ende.grund).toBe('fertig');
    expect(lauf.endwelt.spinne.x).toBe(5);
    expect(Math.max(...lauf.schritte.map((s) => s.tiefe))).toBe(5);
  });

  it('mehr als 500 Aufrufe ineinander enden als Stapelüberlauf', () => {
    const lauf = fuehreAus(p, 'tief', [500], KAMMER);
    expect(lauf.ende.grund).toBe('stapelueberlauf');
    expect(lauf.ende.text).toContain('Die Methode `tief` ruft sich immer wieder selbst auf');
    expect(lauf.ende.text).toContain('StackOverflowError');
    expect(lauf.rueckgabe).toBeUndefined();
    expect(Math.max(...lauf.schritte.map((s) => s.tiefe))).toBe(500);
    expect(lauf.schritte[lauf.schritte.length - 1].rahmen).toHaveLength(500);
  });

  it.each([
    ['endlos', /Die Methode `endlos` ruft sich immer wieder selbst auf/],
    ['ping', /Die Methoden `p[io]ng` und `p[io]ng` rufen sich immer wieder gegenseitig auf/],
  ])('%s: Rekursion ohne Ende wird schnell erkannt', (methode, muster) => {
    for (const aufzeichnen of [true, false]) {
      const start = performance.now();
      const lauf = fuehreAus(p, methode, [], KAMMER, { aufzeichnen });
      expect(performance.now() - start).toBeLessThan(200);
      expect(lauf.ende.grund).toBe('stapelueberlauf');
      expect(lauf.ende.text).toMatch(muster);
    }
  });
});

describe('Endlosschleifen', () => {
  const RING = parseWelt('#####\n#>..#\n#.#.#\n#...#\n#####');
  const KLATSCHE = parseWelt('#######\n#>.K..#\n#######');

  interface Variante {
    name: string;
    rumpf: string[];
    welt: Welt;
    grund: 'endlosschleife' | 'schrittlimit';
    text: RegExp;
    warnungen?: string[];
  }

  const VARIANTEN: Variante[] = [
    {
      name: 'geklatschte Spinne: der Sensor liefert für immer false',
      rumpf: ['while (!hindernisVorn())', '{', '    schritt();', '}'],
      welt: KLATSCHE,
      grund: 'endlosschleife',
      text: /^Die Spinne ist geklatscht – `hindernisVorn\(\)` liefert jetzt immer false, die Schleife endet nie\. Gemeint ist die Schleife `while \(!hindernisVorn\(\)\)` in Zeile 5\.$/,
    },
    {
      name: 'geklatschte Spinne mit Zähl-Sensor',
      rumpf: ['while (fliegenAmPlatz() == 0 && !fliegeGefressen())', '{', '    schritt();', '}'],
      welt: KLATSCHE,
      grund: 'endlosschleife',
      text: /^Die Spinne ist geklatscht – `fliegenAmPlatz\(\)` und `fliegeGefressen\(\)` liefern jetzt immer false bzw\. 0/,
    },
    {
      name: 'im Rumpf ändert sich nichts mehr (Spinne steht vor der Wand)',
      rumpf: ['while (!fliegeAmPlatz())', '{', '    schritt();', '}'],
      welt: FLUR,
      grund: 'endlosschleife',
      text: /^Im Schleifenrumpf ändert sich nichts mehr, wovon die Bedingung abhängt: `schritt\(\)` bewirkt nichts \(„Vor der Spinne liegt ein Hindernis\.“\)\. Deshalb endet die Schleife `while \(!fliegeAmPlatz\(\)\)` in Zeile 5 nie\.$/,
    },
    {
      name: 'Bedingung hängt von nichts ab, was der Rumpf ändert',
      rumpf: ['int n = 3;', 'while (n > 0)', '{', '    hindernisVorn();', '}'],
      welt: KAMMER,
      grund: 'endlosschleife',
      text: /^Im Schleifenrumpf ändert sich nichts mehr, wovon die Bedingung abhängt\. Deshalb endet die Schleife `while \(n > 0\)` in Zeile 6 nie\.$/,
      warnungen: ['ergebnis-unbenutzt'],
    },
    {
      name: 'die Spinne dreht sich im Kreis',
      rumpf: ['while (!fliegeAmPlatz())', '{', '    linksDrehen();', '}'],
      welt: KAMMER,
      grund: 'endlosschleife',
      text: /^Nach 4 Durchläufen ist alles wieder genau wie vorher/,
    },
    {
      name: 'die Spinne läuft immer dieselbe Runde',
      rumpf: ['while (!fliegeAmPlatz())', '{', '    while (!hindernisVorn())', '    {', '        schritt();', '    }', '    rechtsDrehen();', '}'],
      welt: RING,
      grund: 'endlosschleife',
      text: /^Nach 4 Durchläufen ist alles wieder genau wie vorher.*die Schleife `while \(!fliegeAmPlatz\(\)\)` in Zeile 5 endet nie\.$/,
    },
    {
      name: 'eine Variable springt nur hin und her',
      rumpf: ['boolean an = true;', 'while (true)', '{', '    an = !an;', '}'],
      welt: KAMMER,
      grund: 'endlosschleife',
      text: /^Nach 2 Durchläufen ist alles wieder genau wie vorher/,
    },
    {
      name: 'Semikolon hinter while: leerer Rumpf',
      rumpf: ['while (!hindernisVorn());', '{', '    schritt();', '}'],
      welt: FLUR,
      grund: 'endlosschleife',
      text: /^Die Schleife `while \(!hindernisVorn\(\)\)` in Zeile 5 hat einen leeren Rumpf: Direkt hinter der Bedingung steht ein Semikolon\./,
      warnungen: ['semikolon-nach-while'],
    },
    {
      name: 'do-while ohne Fortschritt',
      rumpf: ['do', '{', '    fliegeFressen();', '}', 'while (!fliegeGefressen());'],
      welt: KAMMER,
      grund: 'endlosschleife',
      text: /`fliegeFressen\(\)` bewirkt nichts \(„Auf dem Platz liegt keine Fliege\.“\)\. Deshalb endet die do-while-Schleife mit der Bedingung `!fliegeGefressen\(\)` in Zeile 9 nie\.$/,
    },
    {
      name: 'for ohne Bedingung',
      rumpf: ['for (;;)', '{', '}'],
      welt: KAMMER,
      grund: 'endlosschleife',
      text: /die for-Schleife in Zeile 5/,
    },
    {
      name: 'for mit Zähler, der im Rumpf zurückgesetzt wird',
      rumpf: ['for (int i = 0; i < 3; i++)', '{', '    i = 0;', '}'],
      welt: KAMMER,
      grund: 'endlosschleife',
      text: /die for-Schleife in Zeile 5/,
    },
    {
      name: 'Endlosschleife in einer Hilfsmethode',
      rumpf: ['schritt();', 'hilf();', 'schritt();'],
      welt: FLUR,
      grund: 'endlosschleife',
      text: /Deshalb endet die Schleife `while \(hindernisRechts\(\)\)` in Zeile 11 nie\.$/,
    },
    {
      name: 'Zähler läuft immer weiter (nicht beweisbar)',
      rumpf: ['int i = 0;', 'while (true)', '{', '    i = i + 1;', '}'],
      welt: KAMMER,
      grund: 'schrittlimit',
      text: /^Nach \d+ Schritten abgebrochen: Das Programm läuft sehr wahrscheinlich endlos/,
    },
    {
      name: 'Bauch wird immer voller (nicht beweisbar)',
      rumpf: ['while (!hindernisVorn())', '{', '    fliegenFuettern(1);', '}'],
      welt: KAMMER,
      grund: 'schrittlimit',
      text: /^Nach \d+ Schritten abgebrochen/,
    },
    {
      name: 'immer neue Fliegen auf dem Boden (nicht beweisbar)',
      rumpf: ['while (true)', '{', '    fliegenFuettern(1);', '    fliegeAusspucken();', '    linksDrehen();', '    schritt();', '}'],
      welt: KAMMER,
      grund: 'schrittlimit',
      text: /^Nach \d+ Schritten abgebrochen/,
    },
  ];

  const HILFSMETHODE = ['    private void hilf()', '    {', '        while (hindernisRechts())', '        {', '            linksDrehen();', '            rechtsDrehen();', '        }', '    }'].join('\n');

  describe.each(VARIANTEN)('$name', (v) => {
    const p = programm(`${test1(...v.rumpf)}\n${HILFSMETHODE}`, v.warnungen);

    it.each([true, false])('endet in unter 200 ms mit dem richtigen Grund (aufzeichnen: %s)', (aufzeichnen) => {
      // Einmal warmlaufen, damit die Messung nicht vom JIT abhängt.
      fuehreAus(p, 'test', [], v.welt, { aufzeichnen, maxSchritte: 500 });
      const start = performance.now();
      const lauf = fuehreAus(p, 'test', [], v.welt, { aufzeichnen });
      const dauer = performance.now() - start;
      expect(lauf.ende.grund).toBe(v.grund);
      expect(lauf.ende.text).toMatch(v.text);
      expect(dauer).toBeLessThan(200);
      if (aufzeichnen) {
        expect(lauf.schritte[lauf.schritte.length - 1].ereignis).toBe(lauf.ende);
        expect(lauf.schritte.length).toBeLessThanOrEqual(20_001);
      } else {
        expect(lauf.schritte).toEqual([]);
      }
    });
  });

  it('das Schrittlimit ist 20 000 mit und 200 000 ohne Aufzeichnung und lässt sich einstellen', () => {
    const p = programm(test1('int i = 0;', 'while (true)', '{', '    i = i + 1;', '}'));
    const mit = fuehreAus(p, 'test', [], KAMMER);
    expect(mit.ende.grund).toBe('schrittlimit');
    expect(mit.ende.text).toContain('Nach 20000 Schritten');
    expect(mit.schritte).toHaveLength(20_001);
    expect(fuehreAus(p, 'test', [], KAMMER, { aufzeichnen: false }).ende.text).toContain('Nach 200000 Schritten');
    const kurz = fuehreAus(p, 'test', [], KAMMER, { maxSchritte: 10 });
    expect(kurz.ende).toMatchObject({ grund: 'schrittlimit' });
    expect(kurz.schritte).toHaveLength(11);
    expect(arten(kurz).slice(0, 4)).toEqual(['aufruf', 'variable', 'bedingung', 'variable']);
  });

  it('die bewiesene Endlosschleife bricht sofort ab – lange vor dem Schrittlimit', () => {
    const p = programm(test1('while (!hindernisVorn())', '{', '    schritt();', '}'));
    const lauf = fuehreAus(p, 'test', [], KLATSCHE);
    expect(lauf.ende.grund).toBe('endlosschleife');
    expect(lauf.schritte.length).toBeLessThan(12);
    expect(lauf.endwelt.spinne).toMatchObject({ x: 3, geklatscht: true });
    expect(lauf.konsole).toEqual(['Die Spinne wurde geklatscht.']);
  });

  describe('kein falscher Alarm', () => {
    it('gleiche Welt und gleiche lokale Variablen in verschiedenen Aufrufen sind keine Endlosschleife', () => {
      const p = programm(
        [
          '    private void dreheZweimal()',
          '    {',
          '        int k = 0;',
          '        while (k < 2)',
          '        {',
          '            linksDrehen();',
          '            k++;',
          '        }',
          '    }',
          '    public void achtmal()',
          '    {',
          '        for (int i = 0; i < 4; i++)',
          '        {',
          '            dreheZweimal();',
          '        }',
          '    }',
        ].join('\n'),
      );
      const lauf = fuehreAus(p, 'achtmal', [], KAMMER);
      expect(lauf.ende.grund).toBe('fertig');
      expect(lauf.zaehler).toEqual({ linksDrehen: 8 });
    });

    it('ein Zwischenergebnis im aufrufenden Ausdruck zählt zum Zustand', () => {
      // Beide Aufrufe von f() erreichen die innere Schleife mit gleicher Welt und gleichen Variablen,
      // aber der schon gelesene Summand ist verschieden – das Programm endet.
      const p = programm(
        [
          '    private int f()',
          '    {',
          '        if (!fliegeGefressen())',
          '        {',
          '            fliegenFuettern(1);',
          '        }',
          '        int n = 0;',
          '        while (n < 1)',
          '        {',
          '            n = n + 1;',
          '        }',
          '        return 0;',
          '    }',
          '    public int haupt()',
          '    {',
          '        int x = 5;',
          '        do',
          '        {',
          '            x = 5;',
          '            x = fliegenGefressen() + f();',
          '        }',
          '        while (x == 0);',
          '        return x;',
          '    }',
        ].join('\n'),
      );
      const lauf = fuehreAus(p, 'haupt', [], KAMMER);
      expect(lauf.ende.grund).toBe('fertig');
      expect(lauf.rueckgabe).toBe(1);
    });

    it('eine Schleife, die denselben Weltzustand mit anderem Zählerstand wieder erreicht, läuft normal zu Ende', () => {
      const p = programm(test1('for (int i = 0; i < 40; i++)', '{', '    linksDrehen();', '}', 'int n = 12;', 'while (n > 0)', '{', '    schritt();', '    n--;', '}'));
      const lauf = fuehreAus(p, 'test', [], parseWelt('####\n#>.#\n####'));
      expect(lauf.ende.grund).toBe('fertig');
      expect(lauf.zaehler).toEqual({ linksDrehen: 40, schritt: 12 });
      expect(lauf.konsole).toHaveLength(11);
    });

    it('langes, aber endliches Programm bleibt unter dem Limit', () => {
      const p = programm(test1('int n = 0;', 'for (int i = 0; i < 100; i++)', '{', '    for (int j = 0; j < 30; j++)', '    {', '        n = n + 1;', '    }', '}', 'fliegenFuettern(n);'));
      const lauf = fuehreAus(p, 'test', [], KAMMER);
      expect(lauf.ende.grund).toBe('fertig');
      expect(lauf.endwelt.spinne.gefressen).toBe(3000);
    });
  });
});

describe('Schnappschüsse bleiben unverändert', () => {
  const p = programm(test1('int i = 0;', 'while (i < 3)', '{', '    schritt();', '    i++;', '}', 'fliegeAusspucken();', 'schritt();'));
  const start = parseWelt('######\n#>...#\n######', { gefressen: 1 });
  const urbild = JSON.stringify(start);
  const lauf = fuehreAus(p, 'test', [], start);

  it('die Startwelt wird nicht verändert und steht unverändert im ersten Schritt', () => {
    expect(JSON.stringify(start)).toBe(urbild);
    expect(lauf.schritte[0].welt).toBe(start);
    expect(weltZuText(lauf.schritte[0].welt)).toBe('######\n#>...#\n######');
  });

  it('jeder Schritt behält seinen eigenen Welt- und Variablenstand', () => {
    const verlauf = lauf.schritte.map((s) => `${s.ereignis.art}:x=${s.welt.spinne.x},i=${s.rahmen[0]?.variablen[0]?.wert ?? '-'}`);
    expect(verlauf).toEqual([
      'aufruf:x=1,i=-',
      'variable:x=1,i=0',
      'bedingung:x=1,i=0',
      'aktion:x=2,i=0',
      'variable:x=2,i=1',
      'bedingung:x=2,i=1',
      'aktion:x=3,i=1',
      'variable:x=3,i=2',
      'bedingung:x=3,i=2',
      'aktion:x=4,i=2',
      'variable:x=4,i=3',
      'bedingung:x=4,i=3',
      'aktion:x=4,i=3',
      'aktion:x=4,i=3',
      'rueckkehr:x=4,i=3',
      'ende:x=4,i=-',
    ]);
    expect(lauf.schritte[12].welt.felder[1 * 6 + 4].fliegen).toBe(1);
    expect(lauf.schritte[11].welt.felder[1 * 6 + 4].fliegen).toBe(0);
    expect(lauf.schritte[11].welt.spinne.gefressen).toBe(1);
    expect(lauf.schritte[12].welt.spinne.gefressen).toBe(0);
  });

  it('unveränderte Zustände werden geteilt, geänderte sind neue Objekte', () => {
    expect(lauf.schritte[2].welt).toBe(lauf.schritte[1].welt);
    expect(lauf.schritte[3].welt).not.toBe(lauf.schritte[2].welt);
    expect(lauf.schritte[2].rahmen).toBe(lauf.schritte[1].rahmen);
    expect(lauf.schritte[4].rahmen).not.toBe(lauf.schritte[3].rahmen);
  });

  it('konsoleLaenge sagt, wie viele Konsolenzeilen bis zu diesem Schritt geschrieben waren', () => {
    expect(lauf.konsole).toEqual([MELDUNG_HINDERNIS]);
    expect(lauf.schritte.map((s) => s.konsoleLaenge)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
    expect(lauf.schritte[13].ereignis).toEqual({ art: 'aktion', knoten: expect.any(Number), name: 'schritt', ok: false, meldung: MELDUNG_HINDERNIS });
  });

  it('ein zweiter Lauf von derselben Startwelt liefert exakt dasselbe', () => {
    const vorher = JSON.stringify(lauf.schritte);
    const nochmal = fuehreAus(p, 'test', [], start);
    expect(JSON.stringify(nochmal.schritte)).toBe(vorher);
    expect(JSON.stringify(lauf.schritte)).toBe(vorher);
    expect(nochmal.zaehler).toEqual({ schritt: 4, fliegeAusspucken: 1 });
  });
});

describe('Konsole und eingebaute Methoden', () => {
  it('schreibt die Meldungen der Spinne in die Konsole und zählt die Aktionen', () => {
    const p = programm(test1('schritt();', 'schritt();', 'fliegeFressen();', 'nachrichtenVerbergen();', 'schritt();', 'fliegeAusspucken();', 'nachrichtenZeigen();', 'schritt();'));
    const lauf = fuehreAus(p, 'test', [], parseWelt('####\n#>.#\n####'));
    expect(lauf.konsole).toEqual([MELDUNG_HINDERNIS, MELDUNG_KEINE_FLIEGE, MELDUNG_HINDERNIS]);
    expect(ereignisse(lauf, 'aktion').map((a) => [a.name, a.ok, a.meldung])).toEqual([
      ['schritt', true, undefined],
      ['schritt', false, MELDUNG_HINDERNIS],
      ['fliegeFressen', false, MELDUNG_KEINE_FLIEGE],
      ['nachrichtenVerbergen', true, undefined],
      ['schritt', false, undefined],
      ['fliegeAusspucken', false, undefined],
      ['nachrichtenZeigen', true, undefined],
      ['schritt', false, MELDUNG_HINDERNIS],
    ]);
    expect(lauf.zaehler).toEqual({ schritt: 4, fliegeFressen: 1, nachrichtenVerbergen: 1, fliegeAusspucken: 1, nachrichtenZeigen: 1 });
  });

  it('tempo, setRotation und die get-Methoden funktionieren', () => {
    const p = programm(
      [
        '    public int lage()',
        '    {',
        '        tempo(100);',
        '        setRotation(90);',
        '        schritt();',
        '        return getX() * 100 + getY() * 10 + getRotation() / 90;',
        '    }',
        '    public void drehe(int grad) { setRotation(grad); schritt(); }',
      ].join('\n'),
    );
    expect(wert(p, 'lage')).toBe(231);
    const falsch = fuehreAus(p, 'drehe', [45], KAMMER);
    expect(falsch.ende.grund).toBe('laufzeitfehler');
    expect(falsch.ende.text).toMatch(/^setRotation\(45\) geht in der Spinnenwelt nicht/);
    expect(falsch.endwelt).toBe(KAMMER);
    expect(falsch.zaehler).toEqual({});
    expect(falsch.schritte[falsch.schritte.length - 1].zeile).toBe(10);
  });

  it('eine eigene Methode ersetzt die gleichnamige eingebaute', () => {
    const p = programm(['    public void schritt()', '    {', '        linksDrehen();', '    }', '    public void test()', '    {', '        schritt();', '        schritt();', '    }'].join('\n'), [
      'eingebaut-ueberschrieben',
    ]);
    const lauf = fuehreAus(p, 'test', [], KAMMER);
    expect(endzustand(lauf.endwelt)).toMatchObject({ x: 2, y: 2, richtung: 180 });
    expect(lauf.zaehler).toEqual({ linksDrehen: 2 });
  });

  it('Parameter vom Typ int und boolean werden übergeben', () => {
    const p = programm(
      [
        '    public void gehe(int weit, boolean rueckwaerts)',
        '    {',
        '        if (rueckwaerts)',
        '        {',
        '            linksDrehen();',
        '            linksDrehen();',
        '        }',
        '        for (int i = 0; i < weit; i++)',
        '        {',
        '            schritt();',
        '        }',
        '    }',
        '    public void hin() { gehe(1 + 1, false); gehe(1, 1 > 0); }',
      ].join('\n'),
    );
    expect(endzustand(fuehreAus(p, 'gehe', [3, false], FLUR).endwelt)).toMatchObject({ x: 4, richtung: 0 });
    expect(endzustand(fuehreAus(p, 'gehe', [1, true], parseWelt('#####\n#.>.#\n#####')).endwelt)).toMatchObject({ x: 1, richtung: 180 });
    const hin = fuehreAus(p, 'hin', [], FLUR);
    expect(endzustand(hin.endwelt)).toMatchObject({ x: 2, richtung: 180 });
    expect(ereignisse(hin, 'aufruf').map((a) => a.args)).toEqual([[], [2, false], [1, true]]);
  });
});

describe('fuehreAus wirft nie', () => {
  const p = programm(['    public void geh(int n) { schritt(); }', '    private int geheim() { return 1; }', '    public boolean frei() { return !hindernisVorn(); }'].join('\n'));

  it.each([
    ['unbekannte Methode', 'gibtEsNicht', [], /Eine Methode namens `gibtEsNicht` gibt es in der Klasse `Tarantel` nicht/],
    ['zu wenige Argumente', 'geh', [], /erwartet 1 Wert\(e\), übergeben wurden 0/],
    ['zu viele Argumente', 'geh', [1, 2], /erwartet 1 Wert\(e\), übergeben wurden 2/],
    ['Wahrheitswert statt Zahl', 'geh', [true], /Für den Parameter `int n` von `geh` passt der Wert true nicht/],
    ['Kommazahl', 'geh', [1.5], /passt der Wert 1\.5 nicht/],
  ] as [string, string, Wert[], RegExp][])('%s → Laufzeitfehler statt Ausnahme', (_name, methode, args, muster) => {
    for (const aufzeichnen of [true, false]) {
      const lauf = fuehreAus(p, methode, args, KAMMER, { aufzeichnen });
      expect(lauf.ende.grund).toBe('laufzeitfehler');
      expect(lauf.ende.text).toMatch(muster);
      expect(lauf.endwelt).toBe(KAMMER);
      expect(lauf.schritte).toHaveLength(aufzeichnen ? 1 : 0);
    }
  });

  it('auch private Methoden lassen sich gezielt starten, Rückgabewerte kommen an', () => {
    expect(wert(p, 'geheim')).toBe(1);
    expect(wert(p, 'frei')).toBe(true);
    expect(wert(p, 'frei', [], parseWelt('###\n#>#\n###'))).toBe(false);
  });

  it('ein lückenhafter Entwurf führt zu einem Laufzeitfehler, nicht zu einem Absturz', () => {
    const e = parse(K(test1('schritt();', 'String s = "x";', 'schritt();')));
    expect(e.programm).toBeNull();
    const lauf = fuehreAus(e.entwurf!, 'test', [], FLUR);
    expect(lauf.ende.grund).toBe('laufzeitfehler');
    expect(lauf.endwelt.spinne.x).toBe(2);
    const unbekannt = parse(K(test1('schritt();', 'huepfen();'))).entwurf!;
    expect(fuehreAus(unbekannt, 'test', [], FLUR).ende).toMatchObject({ grund: 'laufzeitfehler', text: 'Die Methode `huepfen()` gibt es nicht.' });
  });
});
