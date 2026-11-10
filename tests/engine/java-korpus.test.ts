import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EINGEBAUT,
  formatiere,
  fuehreAus,
  oeffentlicheMethoden,
  parse,
  pruefeEinrueckung,
  type Lauf,
  type Programm,
  type Wert,
} from '../../src/engine/java';
import { aktion, endzustand, parseWelt, sensor, type Welt } from '../../src/engine/welt';

const QUELLTEXT = readFileSync(fileURLToPath(new URL('../fixtures/Tarantel.original.java', import.meta.url)), 'utf8');

const OFFEN = parseWelt(`
  ##########
  #........#
  #.>..F...#
  #........#
  ##########`);

const WALD = parseWelt(`
  ############
  #..........#
  #....#.....#
  #>...#...F.#
  ############`);

const GANG = parseWelt(`
  ##########
  #.###....#
  #>......K#
  #.###....#
  ##########`);

/** Welt, Argumente und (wo sinnvoll) erwartetes Ergebnis je öffentlicher Methode. */
const PLAN: Record<string, { welt: Welt; args?: Wert[]; grund?: Lauf['ende']['grund']; ende?: Partial<ReturnType<typeof endzustand>> }> = {
  fuenfSchritte: { welt: OFFEN, grund: 'fertig', ende: { x: 7, y: 2, richtung: 0 } },
  fliegeSuchenZurueck: { welt: OFFEN, grund: 'fertig', ende: { x: 2, y: 2, richtung: 180, gefressen: 1, fliegen: '' } },
  drehenBisWegFrei: { welt: parseWelt('#####\n#.#.#\n#.>##\n#.#.#\n#####'), grund: 'fertig', ende: { richtung: 180 } },
  // Läuft an der Wand entlang, bis rechts ein Hindernis liegt.
  nixHindernisFliegeFressen: { welt: parseWelt('########\n#>F2...#\n#....#.#\n########'), grund: 'fertig', ende: { x: 5, gefressen: 2 } },
  wennFliegeFressenWeiter: { welt: parseWelt('#####\n#...#\n#.F.#\n#>F.#\n#####', { fliegenUnterSpinne: 1 }), grund: 'fertig' },
  act: { welt: OFFEN, grund: 'fertig', ende: { richtung: 270 } },
  // Die Methode ruft sich in jeder Welt endlos selbst auf – der Interpreter muss das sauber beenden.
  keineKlatschLauf: { welt: OFFEN, grund: 'stapelueberlauf' },
  rechtsHindernisDannLinks: { welt: parseWelt('####\n#>.#\n####'), grund: 'fertig', ende: { richtung: 270 } },
  wennFliegeAmPlatzFressen: { welt: parseWelt('####\n#>.#\n####', { fliegenUnterSpinne: 1 }), grund: 'fertig', ende: { gefressen: 1, richtung: 180 } },
  wennKlatscheVornAusspuckenUndRechts: {
    welt: parseWelt('#####\n#>K.#\n#...#\n#####', { gefressen: 1 }),
    grund: 'fertig',
    ende: { x: 1, y: 2, richtung: 0, gefressen: 0, fliegen: '1,1:1', lebt: true },
  },
  derGroßeSpucker: { welt: parseWelt('#####\n#>..#\n#####', { gefressen: 1 }), grund: 'fertig', ende: { fliegen: '1,1:1', gefressen: 0 } },
  wennRechtsHinternisDannlinksSonstRechts: { welt: OFFEN, grund: 'fertig', ende: { richtung: 90 } },
  wennFliegeDaEssenUndSchrittSonstAusspuckenUndWenden: { welt: OFFEN, grund: 'fertig', ende: { richtung: 180 } },
  fliegeSuchen2: { welt: OFFEN, grund: 'fertig', ende: { x: 5, y: 2 } },
  fliegeTauschen: { welt: parseWelt('####\n#>.#\n####', { fliegenUnterSpinne: 2 }), grund: 'fertig', ende: { gefressen: 1, fliegen: '1,1:1' } },
  musterTauschen: {
    welt: parseWelt('#######\n#>F.F.#\n#...#.#\n#######'),
    grund: 'fertig',
    ende: { x: 4, gefressen: 10, fliegen: '1,1:1;3,1:1' },
  },
  dieAlleeEntlang: { welt: parseWelt('########\n#####..#\n#>.....#\n#......#\n########'), grund: 'fertig', ende: { x: 5 } },
  tunnelLaufen: { welt: GANG, grund: 'fertig', ende: { x: 5, y: 2, lebt: true } },
  laufenUndFreuen: { welt: GANG, grund: 'fertig', ende: { x: 7, y: 2, lebt: true } },
  fliegeSuchen3: { welt: parseWelt('#########\n#.......#\n#>.K..F.#\n#.......#\n#########'), grund: 'fertig', ende: { x: 6, y: 2, gefressen: 1, lebt: true } },
  struktogrammeUmsetzen: { welt: parseWelt('########\n#>....F#\n#.###..#\n########'), grund: 'fertig', ende: { x: 5 } },
  gehenBisHindernis: { welt: OFFEN, grund: 'fertig', ende: { x: 8 } },
  fliegeImWald: { welt: WALD, grund: 'fertig', ende: { x: 9, y: 3, richtung: 0, gefressen: 1, fliegen: '' } },
  baumUmgehen: { welt: parseWelt('############\n#..........#\n#....#.....#\n#...>#...F.#\n############'), grund: 'fertig', ende: { x: 6, y: 3, richtung: 0 } },
  bisZumErstenBaum: { welt: WALD, grund: 'fertig', ende: { x: 4, y: 3 } },
  fliegenReihe: { welt: OFFEN, args: [4], grund: 'fertig', ende: { x: 6, gefressen: 96, fliegen: '2,2:1;3,2:1;4,2:1;5,2:2' } },
  fliegenReihe1: { welt: OFFEN, grund: 'fertig', ende: { x: 7 } },
  fliegenRechteck: {
    welt: parseWelt('#######\n#>....#\n#.....#\n#.....#\n#.....#\n#######'),
    args: [3, 4],
    grund: 'fertig',
    ende: { x: 1, y: 1, richtung: 270, gefressen: 90, fliegen: '1,1:1;2,1:1;3,1:1;1,2:1;3,2:1;1,3:1;3,3:1;1,4:1;2,4:1;3,4:1' },
  },
  tempoAendern: { welt: OFFEN, args: [20], grund: 'fertig' },
  drehenMitAnzahl: { welt: OFFEN, args: [180], grund: 'fertig', ende: { richtung: 180 } },
};

function ergebnis(lauf: Lauf): unknown {
  return { grund: lauf.ende.grund, ende: endzustand(lauf.endwelt), konsole: lauf.konsole, zaehler: lauf.zaehler, rueckgabe: lauf.rueckgabe };
}

function laufe(programm: Programm, name: string): Lauf {
  const plan = PLAN[name];
  return fuehreAus(programm, name, plan.args ?? [], plan.welt);
}

describe('Tarantel.original.java (echter Schülercode)', () => {
  const geparst = parse(QUELLTEXT);
  const programm = geparst.programm!;

  it('wird vollständig und ohne Fehlerdiagnose geparst', () => {
    expect(geparst.diagnosen.filter((d) => d.schwere !== 'stil')).toEqual([]);
    expect(geparst.programm).not.toBeNull();
    expect(geparst.entwurf).toBe(geparst.programm);
    expect(programm.klasse.name).toBe('Tarantel');
    expect(programm.klasse.oberklasse).toBe('Spinne');
    expect(programm.importe.map((i) => i.name)).toEqual(['greenfoot.*']);
    expect(programm.klasse.methoden).toHaveLength(37);
    expect(programm.nurMethoden).toBe(false);
  });

  it('kennt Bezeichner mit ß und alle Sprachmittel der Vorlage', () => {
    const namen = programm.klasse.methoden.map((m) => m.name);
    expect(namen).toContain('derGroßeSpucker');
    const arten = new Set([...programm.knoten.values()].map((k) => k.art));
    for (const art of ['Solange', 'Wiederhole', 'Zaehl', 'Wenn', 'VarDekl', 'Zuweisung', 'Inkrement', 'Binaer', 'Unaer', 'Klammer', 'Zahl', 'Var']) {
      expect([...arten]).toContain(art);
    }
  });

  it('bewahrt die Kommentare als Liste auf', () => {
    expect(programm.kommentare.map((k) => k.art)).toEqual(['zeile', 'doc']);
    expect(programm.kommentare[0].text).toBe('// (World, Actor, GreenfootImage, Greenfoot and MouseInfo)');
    expect(programm.kommentare[1].text).toContain('@author Jonathan Kreutzheide');
    expect(programm.kommentare[1].pos).toMatchObject({ zeile: 3, endZeile: 8 });
  });

  it('jeder Knoten hat eine eindeutige ID und eine Position im Originaltext', () => {
    expect(programm.knoten.size).toBeGreaterThan(500);
    for (const [id, k] of programm.knoten) {
      expect(k.id).toBe(id);
      expect(k.pos.von).toBeLessThanOrEqual(k.pos.bis);
      expect(k.pos.zeile).toBeLessThanOrEqual(k.pos.endZeile);
    }
    const m = programm.klasse.methoden.find((x) => x.name === 'fliegenReihe')!;
    expect(m.pos.zeile).toBe(317);
    expect(QUELLTEXT.slice(m.kopf.von, m.kopf.bis)).toBe('public void fliegenReihe(int reihenLaenge)');
    expect(m.parameter).toMatchObject([{ typ: 'int', name: 'reihenLaenge' }]);
  });

  it('listet die öffentlichen Methoden mit Parametern auf', () => {
    const oeffentlich = oeffentlicheMethoden(programm);
    expect(oeffentlich.map((m) => m.name).sort()).toEqual(Object.keys(PLAN).sort());
    expect(oeffentlich.find((m) => m.name === 'fliegenRechteck')).toEqual({
      name: 'fliegenRechteck',
      parameter: [
        { name: 'hoehe', typ: 'int' },
        { name: 'breite', typ: 'int' },
      ],
      rueckgabe: 'void',
    });
    expect(oeffentlich.map((m) => m.name)).not.toContain('wenden');
  });

  it.each(Object.keys(PLAN))('%s läuft auf einer passenden Welt bis zu einem ende-Ereignis', (name) => {
    const plan = PLAN[name];
    const start = performance.now();
    const lauf = laufe(programm, name);
    expect(performance.now() - start).toBeLessThan(1000);

    const letzter = lauf.schritte[lauf.schritte.length - 1];
    expect(letzter.ereignis).toBe(lauf.ende);
    expect(lauf.ende.art).toBe('ende');
    expect(lauf.schritte.filter((s) => s.ereignis.art === 'ende')).toHaveLength(1);
    if (plan.grund) expect(lauf.ende.grund).toBe(plan.grund);
    if (plan.ende) expect(endzustand(lauf.endwelt)).toMatchObject(plan.ende);
    for (const s of lauf.schritte) {
      expect(s.zeile).toBeGreaterThanOrEqual(1);
      expect(s.zeile).toBeLessThanOrEqual(372);
    }
  });

  it('drehenMitAnzahl(45) endet mit einem verständlichen Laufzeitfehler', () => {
    const lauf = fuehreAus(programm, 'drehenMitAnzahl', [45], OFFEN);
    expect(lauf.ende.grund).toBe('laufzeitfehler');
    expect(lauf.ende.text).toContain('setRotation(45)');
    expect(lauf.endwelt).toBe(OFFEN);
  });

  it('die Rekursion in keineKlatschLauf endet auch in einer Sackgasse mit Klatsche', () => {
    for (const welt of [GANG, parseWelt('###\n#>#\n###'), parseWelt('#####\n#>K.#\n#####')]) {
      const lauf = fuehreAus(programm, 'keineKlatschLauf', [], welt);
      expect(['stapelueberlauf', 'endlosschleife']).toContain(lauf.ende.grund);
      expect(lauf.ende.text).toBeTruthy();
    }
  });

  describe('formatiere', () => {
    const formatiert = formatiere(programm);
    const neu = parse(formatiert);

    it('liefert Allman-Stil mit vier Leerzeichen und lässt sich wieder fehlerfrei parsen', () => {
      expect(neu.diagnosen).toEqual([]);
      expect(pruefeEinrueckung(formatiert)).toEqual([]);
      expect(formatiert).toContain(
        ['    public void drehenBisWegFrei()', '    {', '        while (hindernisVorn())', '        {', '            linksDrehen();', '        }', '    }'].join('\n'),
      );
      expect(formatiert).toContain(['        do', '        {', '            schritt();', '        }', '        while (hindernisRechts());'].join('\n'));
      expect(formatiert).toContain('        for (int i = 0; i < hoehe - 1; i++)\n        {');
      expect(formatiert).toContain('        while (!(hindernisLinks() && hindernisRechts()))');
      expect(formatiert).toContain('import greenfoot.*;  // (World, Actor, GreenfootImage, Greenfoot and MouseInfo)');
      expect(formatiert).toContain(' * @author Jonathan Kreutzheide');
      expect(formatiert.startsWith('import greenfoot.*;')).toBe(true);
      expect(formatiert.endsWith('}\n')).toBe(true);
    });

    it('ist stabil: nochmal formatieren ändert nichts', () => {
      expect(formatiere(neu.programm!)).toBe(formatiert);
    });

    it.each(Object.keys(PLAN))('%s verhält sich nach dem Formatieren genauso', (name) => {
      expect(ergebnis(laufe(neu.programm!, name))).toEqual(ergebnis(laufe(programm, name)));
    });
  });

  it('die Einrückungsprüfung findet nur die tatsächlich schiefen Zeilen der Vorlage', () => {
    const hinweise = pruefeEinrueckung(QUELLTEXT);
    expect(hinweise.every((d) => d.schwere === 'stil' && d.code === 'einrueckung')).toBe(true);
    expect(hinweise.map((d) => d.pos.zeile)).toEqual([284, 288]);
  });

  it('nur der Klassenrumpf (ohne class-Rahmen) wird mit nurMethoden gleichwertig geparst', () => {
    const zeilen = QUELLTEXT.split('\n');
    const rumpf = zeilen.slice(10, 370).join('\n');
    const ohneRahmen = parse(rumpf, { nurMethoden: true });
    expect(ohneRahmen.diagnosen).toEqual([]);
    const p = ohneRahmen.programm!;
    expect(p.nurMethoden).toBe(true);
    expect(p.klasse).toMatchObject({ name: 'Tarantel', oberklasse: 'Spinne' });
    expect(p.klasse.methoden.map((m) => m.name)).toEqual(programm.klasse.methoden.map((m) => m.name));
    // Positionen beziehen sich auf den übergebenen Text, nicht auf einen gedachten Rahmen.
    const m = p.klasse.methoden[0];
    expect(m.pos.zeile).toBe(1);
    expect(rumpf.slice(m.kopf.von, m.kopf.bis)).toBe('public void fuenfSchritte()');
    expect(ergebnis(fuehreAus(p, 'fliegeImWald', [], WALD))).toEqual(ergebnis(laufe(programm, 'fliegeImWald')));
    // Ohne die Option fehlt die Klasse.
    expect(parse(rumpf).diagnosen[0]).toMatchObject({ code: 'klasse-fehlt', schwere: 'fehler', pos: { zeile: 1 } });
    // Die formatierte Fassung bleibt ohne Rahmen.
    const formatiert = formatiere(p);
    expect(formatiert.startsWith('public void fuenfSchritte()\n{\n    schritt();')).toBe(true);
    expect(parse(formatiert, { nurMethoden: true }).diagnosen).toEqual([]);
  });
});

describe('builtins.ts ist die Schnittstelle der Spinne', () => {
  it('enthält alle Methoden der Vorlage mit den Unterrichtsformulierungen', () => {
    const phrasen = Object.fromEntries(EINGEBAUT.map((e) => [e.name, e.phrase]));
    expect(phrasen).toMatchObject({
      schritt: 'Gehe einen Schritt nach vorne',
      linksDrehen: 'Drehe nach links',
      rechtsDrehen: 'Drehe nach rechts',
      fliegeFressen: 'Friss eine Fliege',
      fliegeAusspucken: 'Spucke eine Fliege aus',
      hindernisVorn: 'Ist ein Hindernis vor mir?',
      hindernisRechts: 'Liegt ein Hindernis rechts neben mir?',
      hindernisLinks: 'Liegt ein Hindernis links neben mir?',
      klatscheVorn: 'Ist vor mir eine Klatsche?',
      fliegeVorn: 'Ist vor mir eine Fliege?',
      fliegeAmPlatz: 'Liegt eine Fliege auf meinem Platz?',
      fliegeGefressen: 'Habe ich eine Fliege gefressen?',
    });
    expect(EINGEBAUT.map((e) => e.name).sort()).toEqual(
      [
        'schritt',
        'linksDrehen',
        'rechtsDrehen',
        'fliegeFressen',
        'fliegeAusspucken',
        'fliegenFuettern',
        'hindernisVorn',
        'hindernisRechts',
        'hindernisLinks',
        'klatscheVorn',
        'fliegeVorn',
        'fliegeAmPlatz',
        'fliegeGefressen',
        'fliegenAmPlatz',
        'fliegenGefressen',
        'tempo',
        'nachrichtenZeigen',
        'nachrichtenVerbergen',
        'setRotation',
        'getX',
        'getY',
        'getRotation',
      ].sort(),
    );
    for (const e of EINGEBAUT) {
      expect(e.beschreibung.length).toBeGreaterThan(10);
      expect(e.phrase.endsWith('?')).toBe(e.rueckgabe !== 'void');
    }
  });

  it('Zwillinge verweisen gegenseitig aufeinander und haben verschiedene Rückgabetypen', () => {
    const nachName = new Map(EINGEBAUT.map((e) => [e.name, e]));
    const paare = EINGEBAUT.filter((e) => e.zwilling);
    expect(paare.map((e) => e.name).sort()).toEqual(['fliegeAmPlatz', 'fliegeGefressen', 'fliegenAmPlatz', 'fliegenGefressen']);
    for (const e of paare) {
      const z = nachName.get(e.zwilling!)!;
      expect(z.zwilling).toBe(e.name);
      expect(z.rueckgabe).not.toBe(e.rueckgabe);
    }
  });

  it('jede eingebaute Methode wird von der Welt ausgeführt und liefert den angegebenen Typ', () => {
    const welt = parseWelt('#####\n#...#\n#.>.#\n#...#\n#####', { gefressen: 1, fliegenUnterSpinne: 1 });
    for (const e of EINGEBAUT) {
      const args = e.parameter.map(() => 90);
      if (e.rueckgabe === 'void') {
        expect(e.art).not.toBe('sensor');
        expect(aktion(welt, e.name, args).ok).toBe(true);
      } else {
        expect(typeof sensor(welt, e.name)).toBe(e.rueckgabe === 'int' ? 'number' : 'boolean');
      }
    }
  });
});
