import { describe, expect, it } from 'vitest';
import { parse } from '../../src/engine/java';
import { blockZuKnoten, checkliste, struktogramm, struktogrammeMitHilfsmethoden, verneine } from '../../src/engine/strukto';

const programm = (quelltext: string) => {
  const { programm: p, diagnosen } = parse(quelltext, { nurMethoden: true });
  if (!p) throw new Error(diagnosen.map((d) => d.text).join('\n'));
  return p;
};

describe('Formulierungen wie im Unterricht', () => {
  it('verneint die Fragen der Sensoren', () => {
    expect(verneine('Ist ein Hindernis vor mir?')).toBe('Ist kein Hindernis vor mir?');
    expect(verneine('Liegt eine Fliege auf meinem Platz?')).toBe('Liegt keine Fliege auf meinem Platz?');
    expect(verneine('Ist vor mir eine Klatsche?')).toBe('Ist vor mir keine Klatsche?');
    expect(verneine('Habe ich eine Fliege gefressen?')).toBe('Habe ich keine Fliege gefressen?');
  });

  it('Arbeitsblatt 08-1, Aufgabe 3: Schleife mit Verzweigung', () => {
    const p = programm(
      'public void schlucht()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            rechtsDrehen();\n            schritt();\n        }\n        else\n        {\n            schritt();\n        }\n    }\n    fliegeFressen();\n}',
    );
    const s = struktogramm(p, 'schlucht');
    expect(s.titel).toBe('schlucht()');
    expect(s.bloecke).toMatchObject([
      {
        art: 'kopf',
        bedingung: 'Liegt keine Fliege auf meinem Platz?',
        rumpf: [
          {
            art: 'verzweigung',
            bedingung: 'Ist ein Hindernis vor mir?',
            dann: [
              { art: 'anweisung', text: 'Drehe nach rechts' },
              { art: 'anweisung', text: 'Gehe einen Schritt nach vorne' },
            ],
            sonst: [{ art: 'anweisung', text: 'Gehe einen Schritt nach vorne' }],
          },
        ],
      },
      { art: 'anweisung', text: 'Friss eine Fliege' },
    ]);
  });

  it('verbindet Fragen mit und/oder und lässt Unklares als Java stehen', () => {
    const p = programm(
      'public void a()\n{\n    while(hindernisLinks() && hindernisRechts())\n    {\n        schritt();\n    }\n    if(!(hindernisLinks() || klatscheVorn()))\n    {\n        schritt();\n    }\n}',
    );
    const [schleife, wenn] = struktogramm(p, 'a').bloecke;
    expect(schleife).toMatchObject({ bedingung: 'Liegt ein Hindernis links neben mir und liegt ein Hindernis rechts neben mir?' });
    // !( … || … ) umgangssprachlich wäre missverständlich – deshalb bleibt es Java.
    expect(wenn).toMatchObject({ bedingung: '!(hindernisLinks() || klatscheVorn())' });
    expect(struktogramm(p, 'a', 'java').bloecke[0]).toMatchObject({ bedingung: 'hindernisLinks() && hindernisRechts()' });
  });

  it('fußgesteuerte Schleife, Zählschleife, leerer Zweig und Aufruf', () => {
    const p = programm(
      'public void b()\n{\n    do\n    {\n        schritt();\n    }\n    while(hindernisRechts());\n    for(int i = 0; i < 3; i++)\n    {\n        hilfe();\n    }\n    if(klatscheVorn())\n    {\n    }\n    else\n    {\n        schritt();\n    }\n}\n\nprivate void hilfe()\n{\n    linksDrehen();\n}',
    );
    const s = struktogramm(p, 'b');
    expect(s.bloecke).toMatchObject([
      { art: 'fuss', bedingung: 'Liegt ein Hindernis rechts neben mir?', rumpf: [{ art: 'anweisung' }] },
      { art: 'zaehl', kopf: 'zähle i von 0 bis 2', rumpf: [{ art: 'aufruf', text: 'hilfe()' }] },
      { art: 'verzweigung', bedingung: 'Ist vor mir eine Klatsche?', dann: [], sonst: [{ art: 'anweisung' }] },
    ]);
    expect(struktogrammeMitHilfsmethoden(p, 'b').map((x) => x.methode)).toEqual(['b', 'hilfe']);
    const liste = checkliste(s);
    expect(liste[0]).toBe('Fußgesteuerte Schleife mit der Bedingung „Liegt ein Hindernis rechts neben mir?“ – ganz oben');
    expect(liste).toContain('Wahr-Zweig von „Ist vor mir eine Klatsche?“ ist leer (∅)');
  });

  it('findet zu jedem ausgeführten Knoten den passenden Block', () => {
    const p = programm('public void c()\n{\n    while(!hindernisVorn())\n    {\n        schritt();\n    }\n}');
    const s = struktogramm(p, 'c');
    const schleife = s.bloecke[0];
    if (schleife.art !== 'kopf') throw new Error('erwartet: Schleife');
    const anw = schleife.rumpf[0];
    for (const id of anw.ids) expect(blockZuKnoten(s.bloecke, id)).toBe(anw);
    expect(blockZuKnoten(s.bloecke, schleife.ids[0])).toBe(schleife);
  });
});
