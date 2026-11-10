import type { Aufgabe } from '../typen';

// Vorhersage-Aufgaben: Quelltext und Ausgangslage sind gegeben, das Ergebnis wird vorhergesagt.
// Die Lösung ermittelt die App durch Ausführen; `erwartet` ist die Gegenprobe im Inhaltstest.

const HINWEISE_SCHREIBTISCHTEST: [string, string, string] = [
  'Spiele den Quelltext Zeile für Zeile durch und führe mit dem Finger die Tarantel in der Welt mit.',
  'Notiere dir nach jeder Anweisung Position und Blickrichtung – wie bei einem Schreibtischtest auf Papier.',
  'Prüfe bei jeder Schleife vor (while) bzw. nach (do-while) jedem Durchlauf neu, ob die Laufbedingung noch wahr ist.',
];

export const AUFGABEN_VORHERSAGE: Aufgabe[] = [
  // ---------- 2.1 Sequenz und Hilfsmethoden ----------
  {
    id: 'v21-sequenz',
    typ: 'vorhersage',
    kann: ['k21-begriffe', 'k21-aufbau'],
    titel: 'Eine Sequenz durchspielen',
    minuten: 2,
    punkte: 3,
    operator: 'interpretieren',
    stellung: 'Die Methode `act()` besteht aus einer Sequenz von fünf Anweisungen. Sage vorher, wo die Tarantel am Ende steht, wohin sie blickt und wie viele Fliegen sie gefressen hat.',
    quelltext: 'public void act()\n{\n    schritt();\n    schritt();\n    linksDrehen();\n    schritt();\n    fliegeFressen();\n}',
    methode: 'act',
    welt: {
      karte: `
        #######
        #.....#
        #..F..#
        #>....#
        #######`,
    },
    fragen: ['feld', 'richtung', 'gefressen'],
    erwartet: { feld: [3, 2], richtung: 270, gefressen: 1 },
    erklaerung: 'Zwei Schritte nach rechts, dann dreht sich die Tarantel nach links – sie blickt jetzt nach **oben**. Der dritte Schritt führt auf das Feld mit der Fliege, die sie dort frisst.',
    hinweise: HINWEISE_SCHREIBTISCHTEST,
  },
  {
    id: 'v21-hilfsmethode',
    typ: 'vorhersage',
    kann: ['k21-hilfsmethoden'],
    titel: 'Hilfsmethoden verfolgen',
    minuten: 3,
    punkte: 3,
    operator: 'interpretieren',
    stellung: '`act()` ruft zwei Hilfsmethoden auf. Verfolge die Aufrufe und sage das Ergebnis vorher.',
    quelltext:
      'public void act()\n{\n    zweiSchritte();\n    fliegeFressen();\n    wenden();\n    zweiSchritte();\n}\n\nprivate void zweiSchritte()\n{\n    schritt();\n    schritt();\n}\n\nprivate void wenden()\n{\n    linksDrehen();\n    linksDrehen();\n}',
    methode: 'act',
    welt: {
      karte: `
        ########
        #>.F...#
        ########`,
    },
    fragen: ['feld', 'richtung', 'gefressen'],
    erwartet: { feld: [1, 1], richtung: 180, gefressen: 1 },
    erklaerung:
      'Bei jedem Aufruf springt das Programm in die Hilfsmethode, arbeitet sie von oben nach unten ab und kehrt hinter den Aufruf zurück. Die Tarantel holt die Fliege, wendet und läuft zwei Schritte zurück: Sie steht wieder am Start, blickt aber nach **links**.',
    hinweise: [
      'Ersetze im Kopf jeden Aufruf durch den Rumpf der aufgerufenen Methode.',
      'Nach dem Ende einer Hilfsmethode geht es in act() mit der nächsten Zeile weiter.',
      'wenden() dreht zweimal nach links – das ist eine halbe Drehung.',
    ],
    quelle: 'Skript S. 8',
  },

  // ---------- 2.2 Schleifen ----------
  {
    id: 'v22-bis-zur-wand',
    typ: 'vorhersage',
    kann: ['k22-lesen'],
    titel: 'Kopfgesteuert bis zur Wand',
    minuten: 2,
    punkte: 2,
    operator: 'interpretieren',
    stellung: 'Sage vorher, wo die Tarantel stehen bleibt und ob eine Meldung erscheint.',
    quelltext: 'public void zurWand()\n{\n    while(!hindernisVorn())\n    {\n        schritt();\n    }\n}',
    methode: 'zurWand',
    welt: {
      karte: `
        #########
        #.>.....#
        #########`,
    },
    fragen: ['feld', 'meldung'],
    erwartet: { feld: [7, 1], meldung: null },
    erklaerung:
      'Vor jedem Durchlauf wird geprüft, ob vorne **kein** Hindernis ist. Auf dem Feld direkt vor der Wand ist die Laufbedingung falsch – die Schleife endet, **bevor** die Tarantel gegen die Wand läuft. Deshalb erscheint keine Meldung.',
    hinweise: HINWEISE_SCHREIBTISCHTEST,
  },
  {
    id: 'v22-fuss-an-der-wand',
    typ: 'vorhersage',
    kann: ['k22-lesen', 'k22-kopf-fuss'],
    titel: 'Fußgesteuert direkt vor der Wand',
    minuten: 2,
    punkte: 2,
    operator: 'interpretieren',
    klausurnah: true,
    stellung: 'Die Tarantel steht schon direkt vor der Wand. Sage vorher, was die fußgesteuerte Schleife bewirkt.',
    quelltext: 'public void zurWand()\n{\n    do\n    {\n        schritt();\n    }\n    while(!hindernisVorn());\n}',
    methode: 'zurWand',
    welt: {
      karte: `
        ######
        #...>#
        ######`,
    },
    fragen: ['feld', 'meldung'],
    erwartet: { feld: [4, 1], meldung: 'Vor der Spinne liegt ein Hindernis.' },
    erklaerung:
      'Bei `do-while` wird der Anweisungsblock **mindestens einmal** ausgeführt – erst danach wird geprüft. Der eine Schritt scheitert am Hindernis: Die Tarantel bleibt stehen und die Meldung erscheint. Eine kopfgesteuerte Schleife hätte hier gar nichts getan.',
    hinweise: [
      'Wann wird bei do-while die Laufbedingung zum ersten Mal geprüft?',
      'Der Block läuft einmal, bevor überhaupt geprüft wird.',
      'schritt() vor einem Hindernis: Die Tarantel bleibt stehen und es gibt eine Meldung in der Konsole.',
    ],
  },
  {
    id: 'v22-fliegenreihe',
    typ: 'vorhersage',
    kann: ['k22-lesen'],
    titel: 'Fressen, solange etwas da ist',
    minuten: 3,
    punkte: 2,
    operator: 'interpretieren',
    stellung: 'Die Tarantel steht auf einer Fliege; rechts von ihr liegen weitere. Sage vorher, wie viele Fliegen sie frisst und wo sie stehen bleibt.',
    quelltext: 'public void reiheFressen()\n{\n    while(fliegeAmPlatz())\n    {\n        fliegeFressen();\n        schritt();\n    }\n}',
    methode: 'reiheFressen',
    welt: {
      karte: `
        #########
        #>FF.F..#
        #########`,
      fliegenUnterSpinne: 1,
    },
    fragen: ['feld', 'gefressen'],
    erwartet: { feld: [4, 1], gefressen: 3 },
    erklaerung:
      'Die Schleife läuft, solange auf dem aktuellen Platz eine Fliege liegt. Nach drei Fliegen steht die Tarantel auf einem leeren Feld – die Laufbedingung ist falsch, die Schleife endet. Die Fliege weiter rechts bleibt liegen.',
    hinweise: HINWEISE_SCHREIBTISCHTEST,
  },
  {
    id: 'v22-klatsche-endlos',
    typ: 'vorhersage',
    kann: ['k22-lesen'],
    titel: 'Gefährlicher Weg',
    minuten: 3,
    punkte: 2,
    operator: 'interpretieren',
    stellung: 'Auf dem Weg zur Wand liegt eine Klatsche. Zur Erinnerung: Eine geklatschte Spinne tut nichts mehr, und alle ihre Prüfmethoden liefern `false`. Endet die Methode?',
    quelltext: 'public void zurWand()\n{\n    while(!hindernisVorn())\n    {\n        schritt();\n    }\n}',
    methode: 'zurWand',
    welt: {
      karte: `
        #########
        #>..K...#
        #########`,
    },
    fragen: ['endet', 'meldung'],
    erwartet: { endet: false, meldung: 'Die Spinne wurde geklatscht.' },
    erklaerung:
      'Die Tarantel läuft auf die Klatsche und wird geklatscht. Ab jetzt liefert `hindernisVorn()` immer `false`, also ist `!hindernisVorn()` immer wahr – und `schritt()` bewirkt nichts mehr. Die Schleife endet nie: eine **Endlosschleife**. In Greenfoot hängt das Programm dann.',
    hinweise: [
      'Was passiert mit der Tarantel auf dem Feld mit der Klatsche?',
      'Welchen Wert liefert hindernisVorn() bei einer geklatschten Spinne?',
      'Wenn die Laufbedingung nie mehr falsch werden kann, endet die Schleife nie.',
    ],
  },

  // ---------- 2.3 Bedingte Anweisungen ----------
  {
    id: 'v23-if-einmal',
    typ: 'vorhersage',
    kann: ['k23-if', 'k23-schleife-vs-bedingung'],
    titel: 'if frisst nur einmal',
    minuten: 2,
    punkte: 2,
    operator: 'interpretieren',
    stellung: 'Auf dem Platz der Tarantel liegen **drei** Fliegen. Sage das Ergebnis vorher.',
    quelltext: 'public void act()\n{\n    if(fliegeAmPlatz())\n    {\n        fliegeFressen();\n    }\n    schritt();\n}',
    methode: 'act',
    welt: {
      karte: `
        ######
        #>...#
        ######`,
      fliegenUnterSpinne: 3,
    },
    fragen: ['feld', 'gefressen'],
    erwartet: { feld: [2, 1], gefressen: 1 },
    erklaerung:
      'Eine bedingte Anweisung prüft ihre Bedingung **einmal** und führt den Block höchstens einmal aus. Die Tarantel frisst eine Fliege, zwei bleiben liegen. `schritt()` steht hinter der if-Anweisung und wird in jedem Fall ausgeführt.',
    hinweise: [
      'Wie oft prüft ein if seine Bedingung?',
      'Achte auf die Klammern: Welche Anweisung gehört zum if, welche steht dahinter?',
      'if: einmal fressen. Danach kommt der Schritt – unabhängig von der Bedingung.',
    ],
  },
  {
    id: 'v23-if-else',
    typ: 'vorhersage',
    kann: ['k23-if'],
    titel: 'Entweder – oder',
    minuten: 2,
    punkte: 2,
    operator: 'interpretieren',
    stellung: 'Die Tarantel steht vor einer Wand. Sage vorher, wo sie am Ende steht und wohin sie blickt.',
    quelltext: 'public void act()\n{\n    if(hindernisVorn())\n    {\n        linksDrehen();\n    }\n    else\n    {\n        schritt();\n    }\n    schritt();\n}',
    methode: 'act',
    welt: {
      karte: `
        #####
        #...#
        #..>#
        #####`,
    },
    fragen: ['feld', 'richtung'],
    erwartet: { feld: [3, 1], richtung: 270 },
    erklaerung:
      'Vorne ist ein Hindernis, also wird **nur** der erste Block ausgeführt: Die Tarantel dreht sich nach links und blickt nach oben. Der else-Block wird übersprungen. Der letzte `schritt()` steht hinter der if-else-Anweisung und führt sie ein Feld nach oben.',
    hinweise: [
      'Welchen Wert hat hindernisVorn() in der Ausgangslage?',
      'Bei if-else wird genau einer der beiden Blöcke ausgeführt.',
      'Nach dem Drehen zeigt „vorne“ in eine neue Richtung.',
    ],
  },

  // ---------- 2.4 Logische Funktionen in Java ----------
  {
    id: 'v24-tunnel',
    typ: 'vorhersage',
    kann: ['k24-java'],
    titel: 'Durch den Tunnel',
    minuten: 3,
    punkte: 2,
    operator: 'interpretieren',
    klausurnah: true,
    stellung: 'Die Methode nutzt zweimal dieselbe UND-Verknüpfung – einmal verneint. Sage vorher, wo die Tarantel stehen bleibt.',
    quelltext:
      'public void tunnelLaufen()\n{\n    while(!(hindernisLinks() && hindernisRechts()))\n    {\n        schritt();\n    }\n    while(hindernisLinks() && hindernisRechts())\n    {\n        schritt();\n    }\n}',
    methode: 'tunnelLaufen',
    welt: {
      karte: `
        ##########
        #..###...#
        #>.......#
        #..###...#
        ##########`,
    },
    fragen: ['feld', 'richtung'],
    erwartet: { feld: [6, 2], richtung: 0 },
    erklaerung:
      'Die erste Schleife läuft, solange die Tarantel **nicht** im Tunnel ist (NICHT UND) – sie endet auf dem ersten Tunnelfeld. Die zweite läuft, solange links **und** rechts ein Hindernis liegt – sie endet auf dem ersten Feld hinter dem Tunnel.',
    hinweise: [
      'Prüfe auf jedem Feld: Liegt links ein Hindernis? Liegt rechts eins?',
      'Die erste Schleife sucht den Eingang, die zweite den Ausgang.',
      '„Links“ und „rechts“ gelten aus Sicht der Tarantel: Sie blickt nach rechts, also ist links oben.',
    ],
    quelle: 'Skript S. 14, Aufgabe 2',
  },

  // ---------- 2.5 Verschachtelte Kontrollstrukturen ----------
  {
    id: 'v25-if-in-while',
    typ: 'vorhersage',
    kann: ['k25-lesen'],
    titel: 'Verzweigung in der Schleife',
    minuten: 3,
    punkte: 2,
    operator: 'interpretieren',
    klausurnah: true,
    stellung: 'Auf dem Weg liegen drei Fliegen. Sage vorher, wie viele die Tarantel frisst und wo sie stehen bleibt.',
    quelltext:
      'public void einsammeln()\n{\n    while(!hindernisVorn())\n    {\n        if(fliegeAmPlatz())\n        {\n            fliegeFressen();\n        }\n        schritt();\n    }\n}',
    methode: 'einsammeln',
    welt: {
      karte: `
        #########
        #>F.F..F#
        #########`,
    },
    fragen: ['feld', 'gefressen'],
    erwartet: { feld: [7, 1], gefressen: 2 },
    erklaerung:
      'In jedem Schleifendurchlauf wird zuerst geprüft, ob auf dem aktuellen Feld eine Fliege liegt, dann geht die Tarantel weiter. Auf dem letzten Feld vor der Wand ist die Laufbedingung falsch – der Rumpf läuft dort **nicht mehr**, die dritte Fliege bleibt liegen. Ein typischer Grenzfall, den man beim Testen prüfen muss.',
    hinweise: [
      'Die Schleife bestimmt, wie oft der Rumpf läuft; das if entscheidet in jedem Durchlauf neu.',
      'Was passiert auf dem letzten Feld vor der Wand: Wird der Rumpf dort noch ausgeführt?',
      'Die Laufbedingung wird geprüft, bevor nach der Fliege gesehen wird.',
    ],
  },
  {
    id: 'v25-umgehen',
    typ: 'vorhersage',
    kann: ['k25-lesen'],
    titel: 'Hindernis umgehen',
    minuten: 4,
    punkte: 3,
    operator: 'interpretieren',
    stellung: 'Schleife, if-else und eine Hilfsmethode greifen ineinander. Sage das Ergebnis vorher.',
    quelltext:
      'public void fliegeSuchen()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            umgehen();\n        }\n        else\n        {\n            schritt();\n        }\n    }\n    fliegeFressen();\n}\n\nprivate void umgehen()\n{\n    linksDrehen();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    linksDrehen();\n}',
    methode: 'fliegeSuchen',
    welt: {
      karte: `
        #########
        #.......#
        #>.#..F.#
        #########`,
    },
    fragen: ['feld', 'richtung', 'gefressen'],
    erwartet: { feld: [6, 2], richtung: 0, gefressen: 1 },
    erklaerung:
      'Der Schleifenkopf prüft die Laufbedingung; im Rumpf springt das Programm in **genau einen** der beiden Fälle. Vor dem Hindernis wird `umgehen()` aufgerufen (oben herum), sonst geht die Tarantel einen Schritt. Liegt eine Fliege am Platz, endet die Schleife und die Fliege wird gefressen.',
    hinweise: [
      'Gehe Durchlauf für Durchlauf vor: erst Laufbedingung, dann if oder else.',
      'umgehen() ist eine feste Sequenz: hoch, zwei Felder weiter, wieder herunter.',
      'Nach umgehen() blickt die Tarantel wieder nach rechts und die Schleife prüft erneut.',
    ],
    quelle: 'Video „Verschachtelte Kontrollstrukturen“',
  },
  {
    id: 'v25-for',
    typ: 'vorhersage',
    kann: ['k25-lesen'],
    titel: 'Zählschleife',
    minuten: 3,
    punkte: 2,
    operator: 'interpretieren',
    stellung: 'Die for-Schleife zählt mit `i` von 0 bis 2, der Rumpf läuft also dreimal. Sage vorher, wo die Tarantel am Ende steht und wohin sie blickt.',
    quelltext: 'public void ecken()\n{\n    for(int i = 0; i < 3; i++)\n    {\n        schritt();\n        linksDrehen();\n    }\n}',
    methode: 'ecken',
    welt: {
      karte: `
        #######
        #.....#
        #.....#
        #.....#
        #>....#
        #######`,
    },
    fragen: ['feld', 'richtung'],
    erwartet: { feld: [1, 3], richtung: 90 },
    erklaerung:
      'Drei Durchläufe (i = 0, 1, 2): jeweils ein Schritt und eine Linksdrehung. Schritt nach rechts, drehen (oben) · Schritt nach oben, drehen (links) · Schritt nach links, drehen (**unten**).',
    hinweise: [
      'Schreibe für jeden Durchlauf den Wert von i, die Position und die Blickrichtung auf.',
      'Die Schleife läuft, solange i < 3 ist: für i = 0, 1 und 2.',
      'Nach jeder Linksdrehung führt der nächste Schritt in eine neue Richtung.',
    ],
  },
  {
    id: 'v25-schleife-in-schleife',
    typ: 'vorhersage',
    kann: ['k25-lesen'],
    titel: 'Schleife in der Schleife',
    minuten: 3,
    punkte: 2,
    operator: 'interpretieren',
    klausurnah: true,
    stellung: 'In der Zählschleife steckt eine kopfgesteuerte Schleife. Sage vorher, wo die Tarantel am Ende steht und wohin sie blickt.',
    quelltext:
      'public void zweiWaende()\n{\n    for(int i = 0; i < 2; i++)\n    {\n        while(!hindernisVorn())\n        {\n            schritt();\n        }\n        linksDrehen();\n    }\n}',
    methode: 'zweiWaende',
    welt: {
      karte: `
        #######
        #.....#
        #.....#
        #>....#
        #######`,
    },
    fragen: ['feld', 'richtung'],
    erwartet: { feld: [5, 1], richtung: 180 },
    erklaerung:
      'Die äußere Schleife läuft zweimal. In jedem Durchlauf läuft die innere Schleife **vollständig** bis zur Wand, erst dann folgt die Linksdrehung. Erst nach rechts bis zur Wand, drehen · dann nach oben bis zur Wand, drehen: Blick nach links.',
    hinweise: [
      'Die innere Schleife wird in jedem Durchlauf der äußeren komplett abgearbeitet.',
      'Erster Durchlauf: bis zur rechten Wand, dann drehen. Was passiert im zweiten?',
      'linksDrehen() gehört zur for-Schleife, nicht zur while-Schleife – achte auf die Einrückung.',
    ],
  },
];
