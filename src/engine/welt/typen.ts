// Datenmodell der Spinnenwelt. Alle Werte werden unveränderlich behandelt:
// jede Aktion liefert eine neue Welt, alte Zustände bleiben gültig.

export type Richtung = 0 | 90 | 180 | 270;

export interface Feld {
  hindernis: boolean;
  klatsche: boolean;
  fliegen: number;
}

export interface SpinneZustand {
  x: number;
  y: number;
  richtung: Richtung;
  gefressen: number;
  geklatscht: boolean;
  nachrichten: boolean;
}

export interface Welt {
  breite: number;
  hoehe: number;
  felder: readonly Feld[];
  spinne: SpinneZustand;
}

export interface Wirkung {
  welt: Welt;
  /** false, wenn die Aktion nichts bewirkt hat (Hindernis, keine Fliege, geklatscht). */
  ok: boolean;
  /** Konsolentext wie im Original, nur wenn Nachrichten eingeschaltet sind. */
  meldung?: string;
  /** Laufzeitfehler (z.B. setRotation(45)); die Welt bleibt dann unverändert. */
  fehler?: string;
}

export interface Endzustand {
  x: number;
  y: number;
  richtung: Richtung;
  gefressen: number;
  lebt: boolean;
  /** Kanonische Darstellung aller Fliegenfelder: "x,y:anzahl" zeilenweise sortiert, mit ";" getrennt. */
  fliegen: string;
}

export const MELDUNG_HINDERNIS = 'Vor der Spinne liegt ein Hindernis.';
export const MELDUNG_GEKLATSCHT = 'Die Spinne wurde geklatscht.';
export const MELDUNG_KEINE_FLIEGE = 'Auf dem Platz liegt keine Fliege.';
export const MELDUNG_NICHTS_GEFRESSEN = 'Die Spinne hat keine Fliege gefressen.';
