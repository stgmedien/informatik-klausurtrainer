import type { Bereich, KannItem } from './typen';

export const BEREICHE: { id: Bereich; titel: string }[] = [
  { id: '1', titel: 'Objektorientierung als Konzept' },
  { id: '2.1', titel: 'Klassenaufbau' },
  { id: '2.2', titel: 'while- und do-while-Schleifen' },
  { id: '2.3', titel: 'Bedingte Anweisung' },
  { id: '2.4', titel: 'Logische Funktionen' },
  { id: '2.5', titel: 'Verschachtelte Kontrollstrukturen' },
  { id: '2.6', titel: 'Struktogramme' },
  { id: '2.7', titel: 'Strukturierte Programmierung' },
];

// Wortlaut nach der Kann-Liste „2026 Klausur IF-EF HJa1“.
export const KANNLISTE: KannItem[] = [
  { id: 'k1-begriffe', bereich: '1', kurz: 'Begriffe', text: 'die Begriffe Klasse, Objekt, Attribut, Attributwert, Methode beschreiben.' },
  {
    id: 'k1-vererbung',
    bereich: '1',
    kurz: 'Vererbung erklären',
    text: 'das Prinzip der Vererbung in Java (u.a. Ober- und Unterklassen, Spezialisierung und Generalisierung) erklären.',
  },
  {
    id: 'k1-diagramm-lesen',
    bereich: '1',
    kurz: 'Klassendiagramm lesen',
    text: 'in einem Klassendiagramm für alle Objekte feststellen, welche Attribute und Methoden sie besitzen.',
  },
  {
    id: 'k1-modellieren',
    bereich: '1',
    kurz: 'Klassendiagramm modellieren',
    text: 'das Konzept der Vererbung sinnvoll anwenden und ein eigenes Klassendiagramm gemäß bestimmter Anforderungen modellieren.',
  },

  { id: 'k21-aufbau', bereich: '2.1', kurz: 'Aufbau einer Klasse', text: 'den Aufbau einer Java-Klasse beschreiben.' },
  { id: 'k21-hilfsmethoden', bereich: '2.1', kurz: 'Hilfsmethoden', text: 'eigene Methoden als Hilfsmethoden definieren, z.B. public void xy().' },
  { id: 'k21-kommentare', bereich: '2.1', kurz: 'Kommentare', text: 'ein- oder mehrzeilige Kommentare in Quelltext einbauen.' },
  { id: 'k21-begriffe', bereich: '2.1', kurz: 'Algorithmus, Anweisung, Sequenz', text: 'die Begriffe Algorithmus, Anweisung und Sequenz beschreiben.' },
  { id: 'k21-einruecken', bereich: '2.1', kurz: 'Einrücken', text: 'Quelltext korrekt einrücken.' },

  { id: 'k22-kopf-fuss', bereich: '2.2', kurz: 'Kopf- vs. Fußsteuerung', text: 'den Unterschied zwischen der Kopf- und Fußsteuerung erklären.' },
  { id: 'k22-lesen', bereich: '2.2', kurz: 'Schleifen lesen', text: 'kopf- oder fußgesteuerte Schleifen als Quelltext interpretieren und beschreiben.' },
  { id: 'k22-schreiben', bereich: '2.2', kurz: 'Schleifen programmieren', text: 'zu einer Aufgabenstellung eine kopf- oder fußgesteuerte Schleife programmieren.' },

  { id: 'k23-schleife-vs-bedingung', bereich: '2.3', kurz: 'Schleife vs. bedingte Anweisung', text: 'den Unterschied zwischen einer Schleife und einer bedingten Anweisung erklären.' },
  // Steht nicht wörtlich in der Kann-Liste, folgt aber aus der Überschrift „Bedingte Anweisung“.
  { id: 'k23-if', bereich: '2.3', kurz: 'if und if-else', text: 'bedingte Anweisungen (if, if-else) lesen und programmieren (aus der Blocküberschrift abgeleitet).' },

  {
    id: 'k24-tabellen',
    bereich: '2.4',
    kurz: 'Wahrheitstabellen',
    text: 'die Wahrheitstabellen der logischen Funktionen UND, ODER, NICHT, NICHT UND, NICHT ODER, EXKLUSIV ODER angeben.',
  },
  { id: 'k24-tabelle-ermitteln', bereich: '2.4', kurz: 'Tabelle ermitteln', text: 'zu einer Aufgabenstellung die geforderte Wahrheitstabelle ermitteln.' },
  {
    id: 'k24-java',
    bereich: '2.4',
    kurz: 'Sensoren verknüpfen',
    text: 'Methoden, die Wahrheitswerte ermitteln (z.B. fliegeAmPlatz(), klatscheVorn(), hindernisVorn()), mit Hilfe der logischen Funktionen in Java-Quelltext anwenden.',
  },
  { id: 'k24-praezedenz', bereich: '2.4', kurz: 'Präzedenzen angeben', text: 'die Präzedenzen von logischen Funktionen angeben.' },
  {
    id: 'k24-praezedenz-anwenden',
    bereich: '2.4',
    kurz: 'Ausdrücke auswerten',
    text: 'die Präzedenzen auf einen logischen Ausdruck anwenden und den Ergebniswahrheitswert ermitteln (auch für Ausdrücke mit mehr als 2 Wahrheitswerten).',
  },

  { id: 'k25-lesen', bereich: '2.5', kurz: 'Verschachtelung lesen', text: 'ineinander verschachtelte Kontrollstrukturen interpretieren und beschreiben.' },
  {
    id: 'k25-schreiben',
    bereich: '2.5',
    kurz: 'Verschachtelt programmieren',
    text: 'mehrere Kontrollstrukturen (while-, do-while-, for-Schleife und bedingte Anweisungen) beim Programmieren ineinander verschachteln.',
  },
  { id: 'k25-einruecken', bereich: '2.5', kurz: 'Verschachtelt einrücken', text: 'verschachtelten Quelltext richtig einrücken.' },

  { id: 'k26-lesen', bereich: '2.6', kurz: 'Struktogramme lesen', text: 'Struktogramme interpretieren und beschreiben.' },
  { id: 'k26-modellieren', bereich: '2.6', kurz: 'Struktogramme modellieren', text: 'einen Algorithmus als Struktogramm modellieren.' },
  { id: 'k26-ueberfuehren', bereich: '2.6', kurz: 'Überführen', text: 'ein Struktogramm in Quelltext überführen, oder umgekehrt.' },

  { id: 'k27-benennen', bereich: '2.7', kurz: '5 Phasen benennen', text: 'die 5 Phasen der strukturierten Programmierung benennen.' },
  { id: 'k27-beschreiben', bereich: '2.7', kurz: '5 Phasen beschreiben', text: 'die 5 Phasen der strukturierten Programmierung beschreiben.' },
  { id: 'k27-anwenden', bereich: '2.7', kurz: '5 Phasen anwenden', text: 'die 5 Phasen der strukturierten Programmierung auf ein Problem anwenden.' },
  {
    id: 'k27-stellung',
    bereich: '2.7',
    kurz: 'Stellung nehmen',
    text: 'begründet dazu Stellung nehmen, bei welchen Problemen dieses Vorgehen sinnvoll oder nicht sinnvoll ist.',
  },
  {
    id: 'k27-argumente',
    bereich: '2.7',
    kurz: 'Drei Argumente',
    text: 'mit mindestens 3 Argumenten begründen, warum dieses Vorgehen bei manchen Problemen sinnvoll ist.',
  },
];

export function kannItem(id: string): KannItem | undefined {
  return KANNLISTE.find((k) => k.id === id);
}
