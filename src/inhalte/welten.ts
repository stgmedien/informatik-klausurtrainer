import type { WeltAngabe } from './typen';

// Vorgefertigte Welten für die Werkstatt, angelehnt an die Szenarien des Skripts.
// Zeichen: # Hindernis, . leer, K Klatsche, F Fliege (2–9 mehrere), > v < ^ Tarantel mit Blickrichtung.

export const WELTEN: { id: string; name: string; welt: WeltAngabe }[] = [
  {
    id: 'leer',
    name: 'Leere Welt',
    welt: {
      karte: `
        ############
        #..........#
        #..........#
        #..........#
        #>.........#
        ############`,
    },
  },
  {
    id: 'schlafplatz',
    name: 'Fliege zum Schlafplatz holen (Skript S. 7)',
    welt: {
      karte: `
        #########
        #>....F.#
        #########`,
    },
  },
  {
    id: 'wald',
    name: 'Fliege im Wald (Skript S. 17)',
    welt: {
      karte: `
        ##############
        #............#
        #............#
        #...#........#
        #...#...#....#
        #...#...#..#.#
        #>..#...#..#F#
        ##############`,
    },
  },
  {
    id: 'tunnel',
    name: 'Tunnel (Skript S. 14)',
    welt: {
      karte: `
        ############
        #...####...#
        #>.........#
        #...####...#
        ############`,
    },
  },
  {
    id: 'allee',
    name: 'Allee (Skript S. 14)',
    welt: {
      karte: `
        ############
        #.#.#.##...#
        #>.........#
        #.##.#.#...#
        ############`,
    },
  },
  {
    id: 'tische',
    name: 'Tische abräumen (Skript S. 15)',
    welt: {
      karte: `
        ##############
        #>.FF..F.FF..#
        #..###..###..#
        #............#
        ##############`,
    },
  },
  {
    id: 'klatschen',
    name: 'Klatschen auf dem Weg',
    welt: {
      karte: `
        ###########
        #.........#
        #>..K...F.#
        #.........#
        ###########`,
    },
  },
  {
    id: 'fliegenfeld',
    name: 'Viele Fliegen',
    welt: {
      karte: `
        ##########
        #F.2.F..3#
        #.F..F...#
        #>.F...F.#
        ##########`,
      fliegenUnterSpinne: 1,
    },
  },
];

export function welt(id: string): WeltAngabe {
  const gefunden = WELTEN.find((w) => w.id === id);
  if (!gefunden) throw new Error(`Unbekannte Welt: ${id}`);
  return gefunden.welt;
}
