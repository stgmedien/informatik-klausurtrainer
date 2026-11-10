import type { KlassenModell } from '../engine/klassen';
import type { Belegung, Notation } from '../engine/logik';

export type Bereich = '1' | '2.1' | '2.2' | '2.3' | '2.4' | '2.5' | '2.6' | '2.7' | 'bonus';

/** Eine „Ich kann …“-Aussage der Kann-Liste. */
export interface KannItem {
  id: string;
  bereich: Bereich;
  /** Wortlaut der Kann-Liste, beginnend nach „Ich kann …“. */
  text: string;
  kurz: string;
}

export interface Erwartungshorizont {
  musterantwort: string;
  kriterien: { id: string; text: string; punkte: number }[];
  fachbegriffe?: string[];
}

export interface ObjektKarte {
  name: string;
  klasse: string;
  attribute: [name: string, wert: string][];
}

/** Welt als Textkarte: # Hindernis, . leer, K Klatsche, F Fliege (2–9 mehrere), > v < ^ Tarantel mit Blickrichtung. */
export interface WeltAngabe {
  karte: string;
  /** Fliegen, die die Tarantel zu Beginn schon gefressen hat. */
  gefressen?: number;
  /** Fliegen auf dem Startfeld der Tarantel. */
  fliegenUnterSpinne?: number;
}

export type VorhersageFrage = 'feld' | 'richtung' | 'gefressen' | 'meldung' | 'endet';

/** Erwartete Antworten einer Vorhersage – als Gegenprobe; maßgeblich ist der tatsächliche Programmlauf. */
export interface VorhersageLoesung {
  feld?: [x: number, y: number];
  richtung?: 0 | 90 | 180 | 270;
  gefressen?: number;
  /** null = keine Meldung in der Konsole. */
  meldung?: string | null;
  endet?: boolean;
}

export interface Testfall {
  name: string;
  welt: WeltAngabe;
  /** Argumente für Methoden mit Parametern. */
  args?: (number | boolean)[];
  /** Beschreibt, welcher Grenzfall hier geprüft wird. */
  grenzfall?: string;
  /** Wird als Ausgangslage in der Aufgabe gezeigt (sonst nur bei der Auswertung). */
  sichtbar?: boolean;
}

export type StrukturMerkmal = 'while' | 'do-while' | 'for' | 'if' | 'if-else' | 'hilfsmethode' | 'und' | 'oder' | 'nicht';

export type Material =
  | { art: 'klassendiagramm'; modell: KlassenModell; titel?: string }
  | { art: 'welt'; welt: WeltAngabe; titel?: string }
  | { art: 'objekte'; objekte: ObjektKarte[]; titel?: string }
  | { art: 'code'; quelltext: string; titel?: string }
  | { art: 'text'; markdown: string };

interface AufgabeBasis {
  id: string;
  /** Lernziele der Kann-Liste, die diese Aufgabe trainiert. */
  kann: string[];
  titel: string;
  minuten: number;
  punkte: number;
  /** Operator der Aufgabenstellung (NRW-Operatorenliste). */
  operator?: string;
  /** Aufgabenstellung (Markdown). */
  stellung: string;
  material?: Material[];
  /** Drei Hinweisstufen: Denkanstoß, Konzept, nächster Teilschritt. */
  hinweise: [string, string, string];
  /** Aufgabe im Klausurformat – zählt für den Status „klausurfest“. */
  klausurnah?: boolean;
  quelle?: string;
}

export type Aufgabe = AufgabeBasis &
  (
    | { typ: 'auswahl'; mehrfach: boolean; optionen: { text: string; richtig: boolean; warum: string }[] }
    | { typ: 'zuordnen'; kategorien: string[]; elemente: { text: string; kategorie: string; warum?: string }[] }
    | { typ: 'reihenfolge'; elemente: string[]; erklaerung?: string }
    | { typ: 'freitext'; erwartung: Erwartungshorizont; zeilen?: number }
    | {
        typ: 'luecke';
        /** Text mit Platzhaltern {{name}}. */
        vorlage: string;
        luecken: Record<string, { akzeptiert: string[]; erklaerung?: string }>;
        /** Quelltext: Groß-/Kleinschreibung zählt, Darstellung in Festbreitenschrift. */
        code?: boolean;
      }
    | {
        typ: 'wahrheitstabelle';
        /** Die Lösung wird aus dem Ausdruck berechnet. */
        ausdruck: string;
        notation: Notation;
        /** Anzeigenamen der Variablen, z.B. { A: 'Hindernis rechts' }. */
        namen?: Record<string, string>;
        ergebnisName?: string;
        /** false: Der Ausdruck bleibt verborgen, die Tabelle wird aus der Situation abgeleitet. */
        ausdruckZeigen: boolean;
      }
    | { typ: 'auswertung'; ausdruck: string; belegung: Belegung; notation: Notation }
    | { typ: 'klassen-lesen'; modell: KlassenModell; objektDerKlasse: string; gesucht: 'attribute' | 'methoden' | 'beides' }
    | {
        typ: 'vorhersage';
        quelltext: string;
        methode: string;
        welt: WeltAngabe;
        /** Wonach gefragt wird. Die Lösung wird durch Ausführen des Quelltexts berechnet. */
        fragen: VorhersageFrage[];
        erwartet: VorhersageLoesung;
        /** Erscheint nach der Abgabe neben dem Programmlauf. */
        erklaerung: string;
        /** Was gezeigt wird: Quelltext (Standard) oder nur das Struktogramm. */
        darstellung?: 'code' | 'struktogramm';
      }
    | {
        typ: 'programmieren';
        /** Startquelltext: Methodenkopf zum Ausfüllen oder fehlerhafter Code bei „Fehler finden“. */
        vorlage: string;
        /** Methode, die in den Testwelten aufgerufen wird. */
        methode: string;
        tests: Testfall[];
        musterloesung: string;
        /** Typische falsche Lösungen; verhält sich die Abgabe genauso, ist der Fehler bekannt. */
        fehlvarianten?: { quelltext: string; muster: string; erklaerung: string }[];
        struktur?: { muss?: StrukturMerkmal[]; verboten?: StrukturMerkmal[] };
        /** Statt einer Beschreibung wird das Struktogramm der Musterlösung als Vorlage gezeigt. */
        struktogrammZeigen?: boolean;
      }
    | {
        typ: 'zeilen-ordnen';
        /** Richtige Lösung, korrekt eingerückt (4 Leerzeichen je Stufe). */
        loesung: string;
        /** Zeilen, die nicht in die Lösung gehören. */
        distraktoren?: string[];
      }
  );

export type AufgabenTyp = Aufgabe['typ'];

export type Abschnitt =
  | { art: 'text'; markdown: string }
  | {
      art: 'merksatz';
      id: string;
      titel: string;
      text: string;
      /** Woher die Formulierung stammt (Skript-Seite bzw. Video). */
      quelle: string;
      /** true: steht nicht im Unterrichtsmaterial – bitte mit dem Heft abgleichen. */
      abgleichen?: boolean;
    }
  | { art: 'material'; material: Material };

export interface Lektion {
  id: string;
  kann: string[];
  titel: string;
  minuten: number;
  abschnitte: Abschnitt[];
}

export type EinheitSchritt =
  | { art: 'lektion'; id: string }
  | { art: 'aufgabe'; id: string }
  | { art: 'logiktraining'; modus: 'auswertung' | 'tabelle'; stufe: 1 | 2 | 3; anzahl: number };

export interface Einheit {
  id: string;
  tag: number;
  titel: string;
  ziel: string;
  schritte: EinheitSchritt[];
  /** Gesetzt, solange Teile dieser Einheit noch nicht in der App enthalten sind. */
  inVorbereitung?: string;
}

export interface Operator {
  name: string;
  definition: string;
  afb: string;
  /** Was die Antwort leisten muss – in Alltagssprache. */
  erwartet: string;
}
