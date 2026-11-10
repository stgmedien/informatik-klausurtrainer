import { describe, expect, it } from 'vitest';
import { fuehreAus, parse, wendeReparaturenAn, type Programm, type Wert } from '../../src/engine/java';
import { endzustand, parseWelt } from '../../src/engine/welt';

interface Probelauf {
  methode: string;
  args?: Wert[];
  karte: string;
  zusatz?: { gefressen?: number; fliegenUnterSpinne?: number };
}

interface Beispiel {
  name: string;
  quelle: string;
  laeufe: Probelauf[];
}

const BEISPIELE: Beispiel[] = [
  {
    name: 'while mit Hilfsmethode',
    quelle: `public class Tarantel extends Spinne
{
    public void zurWand()
    {
        while (!hindernisVorn())
        {
            schritt();
        }
        wenden();
    }

    private void wenden()
    {
        rechtsDrehen();
        rechtsDrehen();
    }
}
`,
    laeufe: [
      { methode: 'zurWand', karte: '#######\n#>....#\n#######' },
      { methode: 'zurWand', karte: '####\n#.<#\n####' },
    ],
  },
  {
    name: 'do-while',
    quelle: `public class Tarantel extends Spinne
{
    public void sammeln()
    {
        do
        {
            fliegeFressen();
            schritt();
        }
        while (fliegeAmPlatz());
        linksDrehen();
    }
}
`,
    laeufe: [
      { methode: 'sammeln', karte: '#######\n#>FF..#\n#######', zusatz: { fliegenUnterSpinne: 1 } },
      { methode: 'sammeln', karte: '#######\n#>....#\n#######' },
    ],
  },
  {
    name: 'for mit Parameter und Rechnung',
    quelle: `public class Tarantel extends Spinne
{
    public void reihe(int laenge)
    {
        fliegenFuettern(laenge * 2);
        for (int i = 0; i < laenge - 1; i++)
        {
            fliegeAusspucken();
            schritt();
        }
        int rest = fliegenGefressen() % 3;
        rest = rest + 1;
        fliegenFuettern(rest);
    }
}
`,
    laeufe: [
      { methode: 'reihe', args: [4], karte: '########\n#>.....#\n########' },
      { methode: 'reihe', args: [0], karte: '########\n#>.....#\n########' },
      { methode: 'reihe', args: [9], karte: '########\n#>.....#\n########' },
    ],
  },
  {
    name: 'if/else verschachtelt',
    quelle: `public class Tarantel extends Spinne
{
    public void entscheiden()
    {
        if (hindernisVorn())
        {
            if (hindernisLinks() && !hindernisRechts())
            {
                rechtsDrehen();
            }
            else
            {
                linksDrehen();
            }
        }
        else if (fliegeAmPlatz() || klatscheVorn())
        {
            fliegeFressen();
        }
        else
        {
            schritt();
        }
    }
}
`,
    laeufe: [
      { methode: 'entscheiden', karte: '####\n#.>#\n####' },
      { methode: 'entscheiden', karte: '#####\n###.#\n#.>##\n#...#\n#####' },
      { methode: 'entscheiden', karte: '#####\n#>..#\n#####', zusatz: { fliegenUnterSpinne: 2 } },
      { methode: 'entscheiden', karte: '#####\n#>K.#\n#####' },
      { methode: 'entscheiden', karte: '#####\n#>..#\n#####' },
    ],
  },
  {
    name: 'boolean-Methode mit return',
    quelle: `public class Tarantel extends Spinne
{
    public boolean wegFrei()
    {
        if (hindernisVorn() || klatscheVorn())
        {
            return false;
        }
        return true;
    }

    public void vorsichtig()
    {
        while (wegFrei())
        {
            schritt();
        }
    }
}
`,
    laeufe: [
      { methode: 'vorsichtig', karte: '########\n#>...K.#\n########' },
      { methode: 'vorsichtig', karte: '########\n#>.....#\n########' },
      { methode: 'wegFrei', karte: '####\n#>K#\n####' },
      { methode: 'wegFrei', karte: '####\n#>.#\n####' },
    ],
  },
  {
    name: 'Attribut, Zähler, verschachtelte Schleifen, return aus der Schleife',
    quelle: `public class Tarantel extends Spinne
{
    private int runden = 0;

    public int zaehleFliegen()
    {
        int anzahl = 0;
        while (!hindernisVorn())
        {
            while (fliegeAmPlatz())
            {
                fliegeFressen();
                anzahl++;
                if (anzahl >= 4)
                {
                    return anzahl;
                }
            }
            schritt();
            runden += 1;
        }
        return anzahl + (runden - runden);
    }
}
`,
    laeufe: [
      { methode: 'zaehleFliegen', karte: '########\n#>F.2..#\n########' },
      { methode: 'zaehleFliegen', karte: '########\n#>3.2..#\n########' },
      { methode: 'zaehleFliegen', karte: '####\n#.>#\n####' },
    ],
  },
  {
    name: 'kompakter K&R-Stil mit import und return ohne Wert',
    quelle: `import greenfoot.*;
public class Tarantel extends Spinne {
    public void kurz() {
        if (!fliegeAmPlatz()) { return; }
        for (int i = 3; i > 0; i--) { linksDrehen(); }
        do { fliegeFressen(); } while (fliegeAmPlatz());
    }
}
`,
    laeufe: [
      { methode: 'kurz', karte: '####\n#>.#\n####' },
      { methode: 'kurz', karte: '####\n#>.#\n####', zusatz: { fliegenUnterSpinne: 3 } },
    ],
  },
];

function verhalten(programm: Programm, beispiel: Beispiel): unknown[] {
  return beispiel.laeufe.map((l) => {
    const lauf = fuehreAus(programm, l.methode, l.args ?? [], parseWelt(l.karte, l.zusatz), { aufzeichnen: false });
    return { grund: lauf.ende.grund, ende: endzustand(lauf.endwelt), konsole: lauf.konsole, rueckgabe: lauf.rueckgabe, zaehler: lauf.zaehler };
  });
}

function zeileVon(quelle: string, offset: number): number {
  return quelle.slice(0, offset).split('\n').length;
}

function stellen(quelle: string, zeichen: string): number[] {
  const ergebnis: number[] = [];
  for (let i = 0; i < quelle.length; i++) if (quelle[i] === zeichen) ergebnis.push(i);
  return ergebnis;
}

describe.each(BEISPIELE)('Mutationen: $name', (beispiel) => {
  const original = parse(beispiel.quelle);
  const soll = original.programm ? verhalten(original.programm, beispiel) : [];

  it('das Original ist fehlerfrei und läuft überall bis zum Ende', () => {
    expect(original.diagnosen).toEqual([]);
    expect(soll).toHaveLength(beispiel.laeufe.length);
    for (const s of soll) expect(s).toMatchObject({ grund: 'fertig' });
  });

  it('jedes gelöschte Semikolon wird höchstens eine Zeile entfernt gemeldet, und die Reparatur stellt das Verhalten wieder her', () => {
    const alle = stellen(beispiel.quelle, ';');
    expect(alle.length).toBeGreaterThan(2);
    for (const i of alle) {
      const mutiert = beispiel.quelle.slice(0, i) + beispiel.quelle.slice(i + 1);
      const zeile = zeileVon(beispiel.quelle, i);
      const hinweis = `Semikolon in Zeile ${zeile} gelöscht`;
      const e = parse(mutiert);
      expect(e.programm, hinweis).toBeNull();

      const treffer = e.diagnosen.filter((d) => d.code === 'semikolon-fehlt' || d.code === 'semikolon-nach-do-while-fehlt');
      expect(treffer, `${hinweis}: ${e.diagnosen.map((d) => d.code).join(', ')}`).toHaveLength(1);
      expect(treffer[0].schwere).toBe('fehler');
      expect(Math.abs(treffer[0].pos.zeile - zeile), hinweis).toBeLessThanOrEqual(1);
      expect(treffer[0].javac).toBe("';' expected");

      const repariert = wendeReparaturenAn(mutiert, e.diagnosen);
      expect(repariert, hinweis).not.toBeNull();
      const neu = parse(repariert!);
      expect(neu.diagnosen, hinweis).toEqual([]);
      expect(verhalten(neu.programm!, beispiel), hinweis).toEqual(soll);
    }
  });

  it.each([')', '}'])('jedes gelöschte %s führt zu mindestens einer Fehlerdiagnose', (zeichen) => {
    const alle = stellen(beispiel.quelle, zeichen);
    expect(alle.length).toBeGreaterThan(2);
    for (const i of alle) {
      const mutiert = beispiel.quelle.slice(0, i) + beispiel.quelle.slice(i + 1);
      const hinweis = `${zeichen} in Zeile ${zeileVon(beispiel.quelle, i)} gelöscht`;
      const e = parse(mutiert);
      const fehler = e.diagnosen.filter((d) => d.schwere === 'fehler');
      expect(fehler.length, hinweis).toBeGreaterThanOrEqual(1);
      expect(e.programm, hinweis).toBeNull();
      const erwartet = zeichen === ')' ? 'klammer-rund-fehlt' : 'klammer-geschweift';
      expect(
        fehler.some((d) => d.code === erwartet || d.code === 'do-ohne-while' || d.code === 'else-ohne-if'),
        `${hinweis}: ${fehler.map((d) => d.code).join(', ')}`,
      ).toBe(true);
    }
  });

  it('eine fehlende runde Klammer lässt sich automatisch ergänzen, ohne das Verhalten zu ändern', () => {
    for (const i of stellen(beispiel.quelle, ')')) {
      const mutiert = beispiel.quelle.slice(0, i) + beispiel.quelle.slice(i + 1);
      const e = parse(mutiert);
      const repariert = wendeReparaturenAn(mutiert, e.diagnosen);
      expect(repariert, `) in Zeile ${zeileVon(beispiel.quelle, i)} gelöscht`).not.toBeNull();
      const neu = parse(repariert!);
      expect(neu.diagnosen).toEqual([]);
      expect(verhalten(neu.programm!, beispiel)).toEqual(soll);
    }
  });

  it('kein einzelnes gelöschtes, verdoppeltes oder ersetztes Zeichen bringt den Parser zum Absturz oder Hängen', () => {
    const start = performance.now();
    for (let i = 0; i < beispiel.quelle.length; i++) {
      const vorn = beispiel.quelle.slice(0, i);
      const hinten = beispiel.quelle.slice(i + 1);
      for (const mutiert of [vorn + hinten, vorn + beispiel.quelle[i] + beispiel.quelle[i] + hinten, `${vorn};${hinten}`, `${vorn}{${hinten}`, `${vorn})${hinten}`]) {
        const e = parse(mutiert);
        // Was als ausführbar gilt, muss sich auch gefahrlos ausführen lassen.
        if (e.programm) {
          for (const l of beispiel.laeufe) {
            const lauf = fuehreAus(e.programm, l.methode, l.args ?? [], parseWelt(l.karte, l.zusatz), { aufzeichnen: false, maxSchritte: 2000 });
            expect(lauf.ende.art).toBe('ende');
          }
        }
      }
    }
    expect(performance.now() - start).toBeLessThan(5000);
  });
});
