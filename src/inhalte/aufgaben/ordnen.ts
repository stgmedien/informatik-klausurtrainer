import type { Aufgabe } from '../typen';

// Zeilen ordnen und einrücken: Die Syntax ist vorgegeben, es geht um Aufbau, Reihenfolge und Einrückung.

export const AUFGABEN_ORDNEN: Aufgabe[] = [
  {
    id: 'z21-klasse',
    typ: 'zeilen-ordnen',
    kann: ['k21-aufbau', 'k21-einruecken'],
    titel: 'Eine Klasse zusammensetzen',
    minuten: 3,
    punkte: 4,
    stellung: 'Setze aus den Zeilen eine vollständige Klasse `Tarantel` mit einer Methode `wenden()` zusammen und rücke korrekt ein. Eine Zeile gehört nicht dazu.',
    loesung: 'import greenfoot.*;\npublic class Tarantel extends Spinne\n{\n    public void wenden()\n    {\n        linksDrehen();\n        linksDrehen();\n    }\n}',
    distraktoren: ['public class Spinne extends Tarantel'],
    hinweise: [
      'Was steht ganz oben in einer Klassendatei, was als Nächstes?',
      'Import → Klassenkopf → { → Methodenkopf → { → Anweisungen → } → }.',
      'Die Methode steht eine Stufe eingerückt in der Klasse, ihre Anweisungen noch eine Stufe weiter.',
    ],
  },
  {
    id: 'z22-while',
    typ: 'zeilen-ordnen',
    kann: ['k22-schreiben', 'k21-einruecken'],
    titel: 'Fliege suchen zusammensetzen',
    minuten: 3,
    punkte: 4,
    stellung: 'Die Tarantel soll geradeaus gehen, bis eine Fliege auf ihrem Platz liegt, und sie dann fressen. Ordne die Zeilen und rücke korrekt ein. Eine Zeile gehört nicht dazu.',
    loesung: 'public void fliegeSuchen()\n{\n    while(!fliegeAmPlatz())\n    {\n        schritt();\n    }\n    fliegeFressen();\n}',
    distraktoren: ['while(fliegeAmPlatz());'],
    hinweise: [
      'Was wird wiederholt, was passiert genau einmal danach?',
      'Die Laufbedingung lautet „solange keine Fliege am Platz liegt“.',
      'fliegeFressen() steht hinter der schließenden Klammer der Schleife – auf derselben Stufe wie while.',
    ],
  },
  {
    id: 'z23-do-while',
    typ: 'zeilen-ordnen',
    kann: ['k22-schreiben', 'k22-kopf-fuss'],
    titel: 'Fußgesteuerte Schleife zusammensetzen',
    minuten: 3,
    punkte: 4,
    stellung: 'Setze eine fußgesteuerte Schleife zusammen: „Führe aus: geh einen Schritt weiter, solange rechts ein Hindernis liegt.“ Danach dreht sich die Tarantel nach rechts. Zwei Zeilen gehören nicht dazu.',
    loesung: 'public void entlangLaufen()\n{\n    do\n    {\n        schritt();\n    }\n    while(hindernisRechts());\n    rechtsDrehen();\n}',
    distraktoren: ['while(hindernisRechts())', 'while(!hindernisRechts());'],
    hinweise: [
      'Bei der fußgesteuerten Schleife steht die Laufbedingung am Fuß, hinter dem Anweisungsblock.',
      'do { … } while(Laufbedingung); – mit Semikolon am Ende.',
      'rechtsDrehen() wird nur einmal ausgeführt, also steht es hinter der Schleife.',
    ],
  },
  {
    id: 'z25-verschachtelt',
    typ: 'zeilen-ordnen',
    kann: ['k25-einruecken', 'k25-schreiben'],
    titel: 'Verschachtelt einrücken',
    minuten: 4,
    punkte: 5,
    klausurnah: true,
    stellung: 'Die Tarantel läuft bis zur Wand und frisst dabei jede Fliege auf ihrem Weg (außer auf dem letzten Feld). Ordne die Zeilen und rücke die verschachtelten Kontrollstrukturen korrekt ein.',
    loesung:
      'public void einsammeln()\n{\n    while(!hindernisVorn())\n    {\n        if(fliegeAmPlatz())\n        {\n            fliegeFressen();\n        }\n        schritt();\n    }\n}',
    hinweise: [
      'Welche Kontrollstruktur steht außen, welche innen?',
      'In jedem Schleifendurchlauf: erst nachsehen (if), dann ein Schritt. Der Schritt gehört nicht in den if-Block.',
      'Drei Stufen: Methode, Schleife, if – jede mit eigenem Klammerpaar auf ihrer Höhe.',
    ],
  },
];
