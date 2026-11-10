import type { Feld, Richtung, Welt } from './typen';

const LEER: Feld = Object.freeze({ hindernis: false, klatsche: false, fliegen: 0 });
const HINDERNIS: Feld = Object.freeze({ hindernis: true, klatsche: false, fliegen: 0 });
const KLATSCHE: Feld = Object.freeze({ hindernis: false, klatsche: true, fliegen: 0 });

const SPINNE_ZEICHEN: Record<string, Richtung> = { '>': 0, v: 90, '<': 180, '^': 270 };
const RICHTUNG_ZEICHEN: Record<Richtung, string> = { 0: '>', 90: 'v', 180: '<', 270: '^' };

/** Feld außerhalb des Rasters: zählt als Hindernis. */
export const AUSSERHALB: Feld = HINDERNIS;

export function neuesFeld(hindernis: boolean, klatsche: boolean, fliegen: number): Feld {
  if (fliegen === 0) {
    if (hindernis && !klatsche) return HINDERNIS;
    if (!hindernis && klatsche) return KLATSCHE;
    if (!hindernis && !klatsche) return LEER;
  }
  return Object.freeze({ hindernis, klatsche, fliegen });
}

function pruefeAnzahl(wert: number | undefined, name: string): number {
  if (wert === undefined) return 0;
  if (!Number.isInteger(wert) || wert < 0) {
    throw new Error(`Weltkarte: „${name}“ muss eine ganze Zahl ab 0 sein (angegeben: ${wert}).`);
  }
  return wert;
}

/**
 * Liest eine Welt aus einer Textkarte.
 * `#` Hindernis, `.` leer, `K` Klatsche, `F` eine Fliege, `2`–`9` so viele Fliegen,
 * `>` `v` `<` `^` Spinne mit Blick nach Osten/Süden/Westen/Norden.
 */
export function parseWelt(karte: string, zusatz?: { gefressen?: number; fliegenUnterSpinne?: number }): Welt {
  let zeilen = karte.split(/\r?\n/).map((z) => z.replace(/\s+$/, ''));
  while (zeilen.length > 0 && zeilen[0] === '') zeilen.shift();
  while (zeilen.length > 0 && zeilen[zeilen.length - 1] === '') zeilen.pop();
  if (zeilen.length === 0) throw new Error('Weltkarte: Die Karte ist leer.');

  const einzug = Math.min(...zeilen.filter((z) => z !== '').map((z) => z.length - z.trimStart().length));
  zeilen = zeilen.map((z) => z.slice(einzug));

  const breite = zeilen[0].length;
  const hoehe = zeilen.length;
  zeilen.forEach((z, i) => {
    if (z.length !== breite) {
      throw new Error(
        `Weltkarte: Alle Zeilen müssen gleich lang sein. Zeile 1 hat ${breite} Zeichen, Zeile ${i + 1} hat ${z.length}.`,
      );
    }
  });
  if (breite < 3 || hoehe < 3) {
    throw new Error(`Weltkarte: Die Welt muss mindestens 3 × 3 Felder groß sein (angegeben: ${breite} × ${hoehe}).`);
  }

  const gefressen = pruefeAnzahl(zusatz?.gefressen, 'gefressen');
  const fliegenUnterSpinne = pruefeAnzahl(zusatz?.fliegenUnterSpinne, 'fliegenUnterSpinne');

  const felder: Feld[] = [];
  let spinne: { x: number; y: number; richtung: Richtung } | null = null;
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const z = zeilen[y][x];
      const ort = `Zeile ${y + 1}, Spalte ${x + 1}`;
      if (z === '#') felder.push(HINDERNIS);
      else if (z === '.') felder.push(LEER);
      else if (z === 'K') felder.push(KLATSCHE);
      else if (z === 'F') felder.push(neuesFeld(false, false, 1));
      else if (z >= '2' && z <= '9') felder.push(neuesFeld(false, false, Number(z)));
      else if (z in SPINNE_ZEICHEN) {
        if (spinne) {
          throw new Error(
            `Weltkarte: Es darf nur eine Spinne geben. Die erste steht in Zeile ${spinne.y + 1}, Spalte ${spinne.x + 1}, eine weitere in ${ort}.`,
          );
        }
        spinne = { x, y, richtung: SPINNE_ZEICHEN[z] };
        felder.push(neuesFeld(false, false, fliegenUnterSpinne));
      } else {
        throw new Error(`Weltkarte: Unbekanntes Zeichen „${z}“ in ${ort}. Erlaubt sind # . K F 2–9 und > v < ^ für die Spinne.`);
      }
      const amRand = x === 0 || y === 0 || x === breite - 1 || y === hoehe - 1;
      if (amRand && z !== '#') {
        throw new Error(`Weltkarte: Der Rand muss vollständig aus Hindernissen (#) bestehen. In ${ort} steht „${z}“.`);
      }
    }
  }
  if (!spinne) throw new Error('Weltkarte: Es fehlt die Spinne. Setze genau eines der Zeichen > v < ^ in die Karte.');

  return Object.freeze({
    breite,
    hoehe,
    felder: Object.freeze(felder),
    spinne: Object.freeze({ ...spinne, gefressen, geklatscht: false, nachrichten: true }),
  });
}

/**
 * Gegenrichtung zu parseWelt. Verlustfrei bis auf das, was die Karte nicht ausdrücken kann:
 * gefressene Fliegen, den Inhalt des Spinnenfelds und mehr als 9 Fliegen auf einem Feld.
 */
export function weltZuText(welt: Welt): string {
  const zeilen: string[] = [];
  for (let y = 0; y < welt.hoehe; y++) {
    let zeile = '';
    for (let x = 0; x < welt.breite; x++) {
      const f = welt.felder[y * welt.breite + x];
      if (x === welt.spinne.x && y === welt.spinne.y) zeile += RICHTUNG_ZEICHEN[welt.spinne.richtung];
      else if (f.hindernis) zeile += '#';
      else if (f.klatsche) zeile += 'K';
      else if (f.fliegen === 1) zeile += 'F';
      else if (f.fliegen > 1) zeile += String(Math.min(f.fliegen, 9));
      else zeile += '.';
    }
    zeilen.push(zeile);
  }
  return zeilen.join('\n');
}
