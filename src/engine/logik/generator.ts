// Erzeugt beliebig viele Logik-Übungen. Gleicher Startwert → gleiche Aufgabe.
import { type Belegung, naivLinksNachRechts, parseLogik, werteAus } from './ausdruck';
import { alleBelegungen } from './tabelle';

/** Kleiner, reproduzierbarer Zufallsgenerator (mulberry32). */
export function zufall(startwert: number): () => number {
  let a = startwert >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Stufe = 1 | 2 | 3;

export interface LogikUebung {
  ausdruck: string;
  belegung: Belegung;
  /** true, wenn stures Rechnen von links nach rechts ein falsches Ergebnis liefert. */
  falleAktiv: boolean;
}

const NAMEN = ['A', 'B', 'C', 'D'];

/**
 * Stufe 1: zwei Werte, ein Operator, evtl. Negation.
 * Stufe 2: drei Werte, UND und ODER gemischt ohne Klammern (Präzedenz entscheidet).
 * Stufe 3: drei bis vier Werte mit Klammer und Negation.
 */
export function erzeugeAusdruck(startwert: number, stufe: Stufe): string {
  const rng = zufall(startwert);
  const wuerfel = (n: number) => Math.floor(rng() * n);
  const neg = (wahrscheinlichkeit: number) => (rng() < wahrscheinlichkeit ? '!' : '');

  if (stufe === 1) {
    const op = wuerfel(2) === 0 ? '&&' : '||';
    return `${neg(0.5)}A ${op} ${neg(0.5)}B`;
  }

  const anzahl = stufe === 2 ? 3 + (wuerfel(3) === 0 ? 1 : 0) : 3 + wuerfel(2);
  const teile = NAMEN.slice(0, anzahl).map((name) => neg(0.35) + name);
  // Mindestens ein ODER, auf das später ein UND folgt: dort schnappt die Präzedenz-Falle zu.
  const ops: string[] = [];
  const oderStelle = wuerfel(anzahl - 2);
  for (let i = 0; i < anzahl - 1; i++) {
    if (i === oderStelle) ops.push('||');
    else if (i === oderStelle + 1) ops.push('&&');
    else ops.push(wuerfel(2) === 0 ? '&&' : '||');
  }

  if (stufe === 3) {
    // Zwei benachbarte Werte einklammern, gern mit Negation davor (NAND/NOR-Muster).
    const start = wuerfel(anzahl - 1);
    const innen = `(${teile[start]} ${ops[start]} ${teile[start + 1]})`;
    teile.splice(start, 2, neg(0.6) + innen);
    ops.splice(start, 1);
  }

  let text = teile[0];
  for (let i = 0; i < ops.length; i++) text += ` ${ops[i]} ${teile[i + 1]}`;
  return text;
}

export function erzeugeUebung(startwert: number, stufe: Stufe): LogikUebung {
  const rng = zufall(startwert * 7919 + stufe);
  const ausdruck = erzeugeAusdruck(startwert, stufe);
  const baum = parseLogik(ausdruck);
  const belegungen = alleBelegungen(NAMEN.filter((name) => ausdruck.includes(name)));
  const mitFalle = belegungen.filter((b) => naivLinksNachRechts(baum, b) !== werteAus(baum, b));
  const auswahl = mitFalle.length > 0 ? mitFalle : belegungen;
  return {
    ausdruck,
    belegung: auswahl[Math.floor(rng() * auswahl.length)],
    falleAktiv: mitFalle.length > 0,
  };
}
