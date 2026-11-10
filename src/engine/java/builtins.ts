// Einzige Quelle für die Schnittstelle der Klasse Spinne (Namen, Typen, Unterrichtsformulierungen).
// Die Semantik selbst steht in src/engine/welt.

import type { Typ } from './ast';

export interface Eingebaut {
  name: string;
  parameter: { name: string; typ: 'int' }[];
  rueckgabe: Typ;
  art: 'aktion' | 'sensor' | 'sonstiges';
  /** Struktogramm-Formulierung wie im Unterricht; `{name}` steht für einen Parameter. */
  phrase: string;
  /** Ein Satz für den Spickzettel. */
  beschreibung: string;
  /** Leicht zu verwechselnde Methode mit anderem Rückgabetyp. */
  zwilling?: string;
}

function aktion(name: string, phrase: string, beschreibung: string, parameter: string[] = []): Eingebaut {
  return { name, parameter: parameter.map((p) => ({ name: p, typ: 'int' })), rueckgabe: 'void', art: 'aktion', phrase, beschreibung };
}

function frage(name: string, phrase: string, beschreibung: string, zwilling?: string): Eingebaut {
  return { name, parameter: [], rueckgabe: 'boolean', art: 'sensor', phrase, beschreibung, ...(zwilling ? { zwilling } : {}) };
}

function zaehlfrage(name: string, phrase: string, beschreibung: string, zwilling: string): Eingebaut {
  return { name, parameter: [], rueckgabe: 'int', art: 'sensor', phrase, beschreibung, zwilling };
}

function sonstiges(name: string, rueckgabe: Typ, phrase: string, beschreibung: string, parameter: string[] = []): Eingebaut {
  return { name, parameter: parameter.map((p) => ({ name: p, typ: 'int' })), rueckgabe, art: 'sonstiges', phrase, beschreibung };
}

export const EINGEBAUT: readonly Eingebaut[] = [
  aktion(
    'schritt',
    'Gehe einen Schritt nach vorne',
    'Die Spinne geht ein Feld in Blickrichtung; vor einem Hindernis bleibt sie stehen, auf einer Klatsche wird sie geklatscht.',
  ),
  aktion('linksDrehen', 'Drehe nach links', 'Die Spinne dreht sich um 90° nach links (gegen den Uhrzeigersinn).'),
  aktion('rechtsDrehen', 'Drehe nach rechts', 'Die Spinne dreht sich um 90° nach rechts (im Uhrzeigersinn).'),
  aktion('fliegeFressen', 'Friss eine Fliege', 'Die Spinne frisst eine Fliege von ihrem Platz, falls dort eine liegt.'),
  aktion('fliegeAusspucken', 'Spucke eine Fliege aus', 'Die Spinne legt eine gefressene Fliege auf ihren Platz, falls sie eine gefressen hat.'),
  aktion(
    'fliegenFuettern',
    'Lass dich mit {anzahl} Fliegen füttern',
    'Die Spinne bekommt die angegebene Anzahl Fliegen zusätzlich in den Bauch.',
    ['anzahl'],
  ),

  frage('hindernisVorn', 'Ist ein Hindernis vor mir?', 'Prüft, ob auf dem Feld vor der Spinne ein Hindernis liegt.'),
  frage('hindernisRechts', 'Liegt ein Hindernis rechts neben mir?', 'Prüft, ob auf dem Feld rechts neben der Spinne ein Hindernis liegt.'),
  frage('hindernisLinks', 'Liegt ein Hindernis links neben mir?', 'Prüft, ob auf dem Feld links neben der Spinne ein Hindernis liegt.'),
  frage('klatscheVorn', 'Ist vor mir eine Klatsche?', 'Prüft, ob auf dem Feld vor der Spinne eine Klatsche lauert.'),
  frage('fliegeVorn', 'Ist vor mir eine Fliege?', 'Prüft, ob auf dem Feld vor der Spinne mindestens eine Fliege liegt.'),
  frage(
    'fliegeAmPlatz',
    'Liegt eine Fliege auf meinem Platz?',
    'Prüft, ob auf dem Platz der Spinne mindestens eine Fliege liegt (true oder false).',
    'fliegenAmPlatz',
  ),
  frage(
    'fliegeGefressen',
    'Habe ich eine Fliege gefressen?',
    'Prüft, ob die Spinne mindestens eine Fliege gefressen hat (true oder false).',
    'fliegenGefressen',
  ),
  zaehlfrage(
    'fliegenAmPlatz',
    'Wie viele Fliegen liegen auf meinem Platz?',
    'Liefert die Anzahl der Fliegen auf dem Platz der Spinne (eine Zahl).',
    'fliegeAmPlatz',
  ),
  zaehlfrage(
    'fliegenGefressen',
    'Wie viele Fliegen habe ich gefressen?',
    'Liefert die Anzahl der Fliegen, die die Spinne gefressen hat (eine Zahl).',
    'fliegeGefressen',
  ),

  sonstiges(
    'tempo',
    'void',
    'Stelle das Tempo auf {aktionenProSekunde} Aktionen pro Sekunde',
    'Legt fest, wie schnell die Spinne ihre Aktionen ausführt; am Ergebnis ändert das nichts.',
    ['aktionenProSekunde'],
  ),
  sonstiges('nachrichtenZeigen', 'void', 'Zeige Meldungen an', 'Schaltet die Meldungen der Spinne in der Konsole ein.'),
  sonstiges('nachrichtenVerbergen', 'void', 'Verberge Meldungen', 'Schaltet die Meldungen der Spinne in der Konsole aus.'),
  sonstiges(
    'setRotation',
    'void',
    'Schaue in Richtung {rotation}',
    'Setzt die Blickrichtung direkt: 0 = Osten, 90 = Süden, 180 = Westen, 270 = Norden.',
    ['rotation'],
  ),
  sonstiges('getX', 'int', 'In welcher Spalte stehe ich?', 'Liefert die Spalte der Spinne (0 ist ganz links).'),
  sonstiges('getY', 'int', 'In welcher Zeile stehe ich?', 'Liefert die Zeile der Spinne (0 ist ganz oben).'),
  sonstiges('getRotation', 'int', 'In welche Richtung schaue ich?', 'Liefert die Blickrichtung: 0 = Osten, 90 = Süden, 180 = Westen, 270 = Norden.'),
];

const NACH_NAME = new Map(EINGEBAUT.map((e) => [e.name, e]));

export function findeEingebaut(name: string): Eingebaut | undefined {
  return NACH_NAME.get(name);
}

/** Methoden aus Greenfoot/Actor, die Schüler kennen könnten, die es in der App aber nicht gibt. */
export const GREENFOOT_FREMD: readonly string[] = [
  'move',
  'turn',
  'setLocation',
  'getWorld',
  'setImage',
  'getImage',
  'isTouching',
  'removeTouching',
  'isAtEdge',
  'turnTowards',
  'getOneObjectAtOffset',
  'getObjectsAtOffset',
  'getOneIntersectingObject',
  'pause',
];
