import { AUSSERHALB, neuesFeld } from './karte';
import {
  MELDUNG_GEKLATSCHT,
  MELDUNG_HINDERNIS,
  MELDUNG_KEINE_FLIEGE,
  MELDUNG_NICHTS_GEFRESSEN,
  type Endzustand,
  type Feld,
  type Richtung,
  type SpinneZustand,
  type Welt,
  type Wirkung,
} from './typen';

/** Feld an (x, y); außerhalb des Rasters ein Hindernis. */
export function feld(welt: Welt, x: number, y: number): Feld {
  if (x < 0 || y < 0 || x >= welt.breite || y >= welt.hoehe) return AUSSERHALB;
  return welt.felder[y * welt.breite + x];
}

type Seite = 'vorn' | 'rechts' | 'links';
const DREHUNG: Record<Seite, number> = { vorn: 0, rechts: 90, links: 270 };

function versatz(richtung: number): { dx: number; dy: number } {
  switch (richtung) {
    case 0:
      return { dx: 1, dy: 0 };
    case 90:
      return { dx: 0, dy: 1 };
    case 180:
      return { dx: -1, dy: 0 };
    default:
      return { dx: 0, dy: -1 };
  }
}

function nachbar(welt: Welt, seite: Seite): { x: number; y: number; feld: Feld } {
  const { dx, dy } = versatz((welt.spinne.richtung + DREHUNG[seite]) % 360);
  const x = welt.spinne.x + dx;
  const y = welt.spinne.y + dy;
  return { x, y, feld: feld(welt, x, y) };
}

function mitSpinne(welt: Welt, aenderung: Partial<SpinneZustand>): Welt {
  return Object.freeze({ ...welt, spinne: Object.freeze({ ...welt.spinne, ...aenderung }) });
}

function mitFliegen(welt: Welt, x: number, y: number, fliegen: number, spinne: Partial<SpinneZustand>): Welt {
  const felder = welt.felder.slice();
  const alt = felder[y * welt.breite + x];
  felder[y * welt.breite + x] = neuesFeld(alt.hindernis, alt.klatsche, fliegen);
  // Die Zeilen-Hashes der alten Welt gelten weiter – bis auf die eine geänderte Zeile.
  const alteZeilen = zeilenHashes.get(welt.felder);
  if (alteZeilen) {
    const zeilen = alteZeilen.slice();
    zeilen[y] = zeilenHash(felder, y * welt.breite, welt.breite);
    zeilenHashes.set(felder, zeilen);
  }
  // Das Array wird nicht eingefroren (das kostet bei jedem Fressen/Ausspucken spürbar Zeit);
  // der Typ `readonly Feld[]` und die Tests sichern, dass es niemand verändert.
  return Object.freeze({
    ...welt,
    felder,
    spinne: Object.freeze({ ...welt.spinne, ...spinne }),
  });
}

function ganzzahl(name: string, args: number[]): number {
  const wert = args[0];
  if (args.length !== 1 || !Number.isInteger(wert)) {
    throw new Error(`${name}(...) erwartet genau eine ganze Zahl.`);
  }
  return wert;
}

/** Führt eine eingebaute void-Methode der Spinne aus (Semantik wie Spinne.java). */
export function aktion(welt: Welt, name: string, args: number[]): Wirkung {
  const s = welt.spinne;
  const wirkungslos: Wirkung = { welt, ok: false };
  const meldung = (text: string): Wirkung => (s.nachrichten ? { welt, ok: false, meldung: text } : wirkungslos);

  switch (name) {
    case 'schritt': {
      if (s.geklatscht) return wirkungslos;
      const vorn = nachbar(welt, 'vorn');
      // Wie im Original entscheidet zuerst das Hindernis; eine Klatsche darunter spielt dann keine Rolle.
      if (vorn.feld.hindernis) return meldung(MELDUNG_HINDERNIS);
      if (vorn.feld.klatsche) {
        const neu = mitSpinne(welt, { x: vorn.x, y: vorn.y, geklatscht: true });
        return s.nachrichten ? { welt: neu, ok: true, meldung: MELDUNG_GEKLATSCHT } : { welt: neu, ok: true };
      }
      return { welt: mitSpinne(welt, { x: vorn.x, y: vorn.y }), ok: true };
    }
    case 'linksDrehen':
    case 'rechtsDrehen': {
      if (s.geklatscht) return wirkungslos;
      const richtung = ((s.richtung + (name === 'linksDrehen' ? 270 : 90)) % 360) as Richtung;
      return { welt: mitSpinne(welt, { richtung }), ok: true };
    }
    case 'fliegeFressen': {
      if (s.geklatscht) return wirkungslos;
      const platz = feld(welt, s.x, s.y);
      if (platz.fliegen <= 0) return meldung(MELDUNG_KEINE_FLIEGE);
      return { welt: mitFliegen(welt, s.x, s.y, platz.fliegen - 1, { gefressen: s.gefressen + 1 }), ok: true };
    }
    case 'fliegeAusspucken': {
      if (s.geklatscht) return wirkungslos;
      if (s.gefressen <= 0) return meldung(MELDUNG_NICHTS_GEFRESSEN);
      const platz = feld(welt, s.x, s.y);
      return { welt: mitFliegen(welt, s.x, s.y, platz.fliegen + 1, { gefressen: s.gefressen - 1 }), ok: true };
    }
    case 'fliegenFuettern': {
      const anzahl = ganzzahl(name, args);
      if (s.geklatscht) return wirkungslos;
      // Das Original addiert ungeprüft; der int-Überlauf gehört dazu.
      return { welt: mitSpinne(welt, { gefressen: (s.gefressen + anzahl) | 0 }), ok: true };
    }
    case 'nachrichtenZeigen':
    case 'nachrichtenVerbergen': {
      if (s.geklatscht) return wirkungslos;
      const nachrichten = name === 'nachrichtenZeigen';
      return { welt: nachrichten === s.nachrichten ? welt : mitSpinne(welt, { nachrichten }), ok: true };
    }
    case 'tempo':
      ganzzahl(name, args);
      // Das Tempo steuert im Original nur die Animation und gehört nicht zum Weltzustand.
      return { welt, ok: true };
    case 'setRotation': {
      const rotation = ganzzahl(name, args);
      if (rotation !== 0 && rotation !== 90 && rotation !== 180 && rotation !== 270) {
        return {
          welt,
          ok: false,
          fehler: `setRotation(${rotation}) geht in der Spinnenwelt nicht: Die Spinne kann nur nach 0 (Osten), 90 (Süden), 180 (Westen) oder 270 (Norden) schauen.`,
        };
      }
      // setRotation stammt aus der Greenfoot-Klasse Actor und wirkt deshalb auch bei geklatschter Spinne.
      return { welt: rotation === s.richtung ? welt : mitSpinne(welt, { richtung: rotation }), ok: true };
    }
    default:
      throw new Error(`Unbekannte Aktion der Spinne: ${name}`);
  }
}

/** Wertet eine eingebaute Abfrage-Methode der Spinne aus (Semantik wie Spinne.java). */
export function sensor(welt: Welt, name: string): boolean | number {
  const s = welt.spinne;
  switch (name) {
    case 'hindernisVorn':
      return !s.geklatscht && nachbar(welt, 'vorn').feld.hindernis;
    case 'hindernisRechts':
      return !s.geklatscht && nachbar(welt, 'rechts').feld.hindernis;
    case 'hindernisLinks':
      return !s.geklatscht && nachbar(welt, 'links').feld.hindernis;
    case 'klatscheVorn':
      return !s.geklatscht && nachbar(welt, 'vorn').feld.klatsche;
    case 'fliegeVorn':
      return !s.geklatscht && nachbar(welt, 'vorn').feld.fliegen > 0;
    case 'fliegeAmPlatz':
      return !s.geklatscht && feld(welt, s.x, s.y).fliegen > 0;
    case 'fliegeGefressen':
      return !s.geklatscht && s.gefressen > 0;
    case 'fliegenAmPlatz':
      return s.geklatscht ? 0 : feld(welt, s.x, s.y).fliegen;
    case 'fliegenGefressen':
      return s.geklatscht ? 0 : s.gefressen;
    // Die get-Methoden kommen von Actor und kennen "geklatscht" nicht.
    case 'getX':
      return s.x;
    case 'getY':
      return s.y;
    case 'getRotation':
      return s.richtung;
    default:
      throw new Error(`Unbekannte Abfrage der Spinne: ${name}`);
  }
}

// Der Felder-Teil ändert sich nur beim Fressen und Ausspucken (Schritte und Drehungen teilen sich das Array),
// und dann nur in einer Zeile. Deshalb wird der Hash zeilenweise gemerkt und weitergereicht.
const zeilenHashes = new WeakMap<readonly Feld[], string[]>();
const felderHashes = new WeakMap<readonly Feld[], string>();

function zeilenHash(felder: readonly Feld[], start: number, breite: number): string {
  let hash = '';
  for (let i = start; i < start + breite; i++) {
    const f = felder[i];
    hash += f.hindernis ? (f.klatsche ? 'X' : '#') : f.klatsche ? 'K' : '.';
    if (f.fliegen !== 0) hash += f.fliegen;
  }
  return hash;
}

function felderHash(welt: Welt): string {
  const felder = welt.felder;
  let hash = felderHashes.get(felder);
  if (hash === undefined) {
    let zeilen = zeilenHashes.get(felder);
    if (!zeilen) {
      zeilen = [];
      for (let y = 0; y < welt.hoehe; y++) zeilen.push(zeilenHash(felder, y * welt.breite, welt.breite));
      zeilenHashes.set(felder, zeilen);
    }
    hash = zeilen.join('/');
    felderHashes.set(felder, hash);
  }
  return hash;
}

/** Gleicher Hash genau dann, wenn zwei Welten in allem übereinstimmen, was das Verhalten der Spinne bestimmt. */
export function weltHash(welt: Welt): string {
  const s = welt.spinne;
  return `${welt.breite}x${welt.hoehe}|${s.x},${s.y},${s.richtung},${s.gefressen},${s.geklatscht ? 1 : 0},${s.nachrichten ? 1 : 0}|${felderHash(welt)}`;
}

export function endzustand(welt: Welt): Endzustand {
  const fliegen: string[] = [];
  welt.felder.forEach((f, i) => {
    if (f.fliegen > 0) fliegen.push(`${i % welt.breite},${Math.floor(i / welt.breite)}:${f.fliegen}`);
  });
  const s = welt.spinne;
  return { x: s.x, y: s.y, richtung: s.richtung, gefressen: s.gefressen, lebt: !s.geklatscht, fliegen: fliegen.join(';') };
}
