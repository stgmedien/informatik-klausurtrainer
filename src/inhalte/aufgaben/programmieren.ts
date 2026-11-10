import type { Aufgabe } from '../typen';

// Programmieraufgaben im Papier-Modus. Geprüft wird das Verhalten in mehreren Testwelten
// im Vergleich zur Musterlösung; die Inhaltstests stellen sicher, dass jede Musterlösung
// alle Welten besteht und jede Fehlvariante mindestens eine nicht.

const HINWEISE_PROGRAMM = (konzept: string, schritt: string): [string, string, string] => [
  'Beschreibe zuerst in Worten, was die Tarantel tun soll – Schritt für Schritt. Welche Teile wiederholen sich, welche hängen von einer Bedingung ab?',
  konzept,
  schritt,
];

export const AUFGABEN_PROGRAMMIEREN: Aufgabe[] = [
  // ---------- 2.1 Hilfsmethoden ----------
  {
    id: 'p21-fliege-holen',
    typ: 'programmieren',
    kann: ['k21-hilfsmethoden', 'k21-aufbau'],
    titel: 'Fliege zum Schlafplatz holen',
    minuten: 6,
    punkte: 4,
    operator: 'implementieren',
    stellung:
      'Die Tarantel soll eine Fliege holen, die **drei Felder** vor ihr liegt, und danach an ihren Startplatz zurückkehren. Am Ende blickt sie in die entgegengesetzte Richtung.\n\nImplementiere die Methode `fliegeHolen()`. Lagere das Umdrehen in eine Hilfsmethode `wenden()` aus.',
    vorlage: 'public void fliegeHolen()\n{\n    \n}\n',
    methode: 'fliegeHolen',
    tests: [
      {
        name: 'Fliege drei Felder entfernt',
        sichtbar: true,
        welt: {
          karte: `
            #######
            #>..F.#
            #######`,
        },
      },
      {
        name: 'Im Raum',
        welt: {
          karte: `
            ########
            #......#
            #..>..F#
            #......#
            ########`,
        },
      },
    ],
    musterloesung:
      'public void fliegeHolen()\n{\n    schritt();\n    schritt();\n    schritt();\n    fliegeFressen();\n    wenden();\n    schritt();\n    schritt();\n    schritt();\n}\n\npublic void wenden()\n{\n    linksDrehen();\n    linksDrehen();\n}',
    fehlvarianten: [
      {
        quelltext: 'public void fliegeHolen()\n{\n    schritt();\n    schritt();\n    schritt();\n    fliegeFressen();\n    linksDrehen();\n    schritt();\n    schritt();\n    schritt();\n}',
        muster: 'ablauf.ziel-verfehlt',
        erklaerung: 'Einmal links drehen ist nur eine Vierteldrehung – zum Umdrehen braucht es zwei.',
      },
    ],
    struktur: { muss: ['hilfsmethode'] },
    hinweise: HINWEISE_PROGRAMM(
      'Eine Hilfsmethode ist eine eigene Methode mit eigenem Kopf (z.B. public void wenden()), die du in fliegeHolen() aufrufst.',
      'Die Reihenfolge: drei Schritte, fressen, wenden(), drei Schritte. wenden() besteht aus zwei Linksdrehungen.',
    ),
    quelle: 'Skript S. 7–8',
  },

  // ---------- 2.2 Schleifen ----------
  {
    id: 'p22-bis-zur-fliege',
    typ: 'programmieren',
    kann: ['k22-schreiben'],
    titel: 'Bis zur Fliege laufen',
    minuten: 4,
    punkte: 3,
    operator: 'implementieren',
    klausurnah: true,
    stellung:
      'Irgendwo in Blickrichtung der Tarantel liegt eine Fliege – wie weit entfernt, ist unbekannt. Sie kann auch schon auf dem Startfeld liegen.\n\nImplementiere `fliegeSuchen()`: Die Tarantel geht bis zur Fliege und frisst sie.',
    vorlage: 'public void fliegeSuchen()\n{\n    \n}\n',
    methode: 'fliegeSuchen',
    tests: [
      { name: 'Fliege vier Felder entfernt', sichtbar: true, welt: { karte: '#########\n#>...F..#\n#########' } },
      { name: 'Fliege direkt davor', welt: { karte: '######\n#>F..#\n######' } },
      { name: 'Fliege auf dem Startfeld', grenzfall: 'die Fliege liegt schon am Start', welt: { karte: '######\n#>...#\n######', fliegenUnterSpinne: 1 } },
    ],
    musterloesung: 'public void fliegeSuchen()\n{\n    while(!fliegeAmPlatz())\n    {\n        schritt();\n    }\n    fliegeFressen();\n}',
    fehlvarianten: [
      {
        quelltext: 'public void fliegeSuchen()\n{\n    do\n    {\n        schritt();\n    }\n    while(!fliegeAmPlatz());\n    fliegeFressen();\n}',
        muster: 'kontrolle.kopf-fuss',
        erklaerung: 'Mit do-while geht die Tarantel immer mindestens einen Schritt – auch wenn die Fliege schon am Start liegt.',
      },
      {
        quelltext: 'public void fliegeSuchen()\n{\n    while(fliegeAmPlatz())\n    {\n        schritt();\n    }\n    fliegeFressen();\n}',
        muster: 'logik.verneinung',
        erklaerung: 'Die Laufbedingung muss „solange KEINE Fliege am Platz liegt“ heißen – das ! fehlt.',
      },
      {
        quelltext: 'public void fliegeSuchen()\n{\n    if(!fliegeAmPlatz())\n    {\n        schritt();\n    }\n    fliegeFressen();\n}',
        muster: 'kontrolle.if-statt-while',
        erklaerung: 'Ein if geht höchstens einen Schritt. Für „bis zur Fliege“ braucht es eine Schleife.',
      },
    ],
    struktur: { muss: ['while'] },
    hinweise: HINWEISE_PROGRAMM(
      'Die Anzahl der Schritte ist unbekannt – also eine Schleife. Und weil die Fliege schon am Start liegen kann, muss vor dem ersten Schritt geprüft werden.',
      'Kopfgesteuert: while(!fliegeAmPlatz()) { schritt(); } – danach einmal fressen.',
    ),
  },
  {
    id: 'p22-kopf-zu-fuss',
    typ: 'programmieren',
    kann: ['k22-schreiben', 'k22-kopf-fuss'],
    titel: 'Kopfgesteuert → fußgesteuert',
    minuten: 4,
    punkte: 3,
    operator: 'überführen',
    klausurnah: true,
    stellung:
      'Die Methode `treppeHoch()` nutzt eine kopfgesteuerte Schleife. Überführe sie in eine Methode mit **fußgesteuerter** Schleife, die sich in allen gezeigten Welten genauso verhält. (In diesen Welten ist rechts von der Tarantel zu Beginn immer ein Hindernis.)',
    vorlage:
      'public void treppeHoch()\n{\n    while(hindernisRechts())\n    {\n        schritt();\n    }\n    rechtsDrehen();\n    schritt();\n}\n',
    methode: 'treppeHoch',
    tests: [
      {
        name: 'Kurze Mauer',
        sichtbar: true,
        welt: { karte: '#######\n#.....#\n#.....#\n#.#...#\n#^#...#\n#######' },
      },
      {
        name: 'Lange Mauer',
        welt: { karte: '#######\n#.....#\n#.#...#\n#.#...#\n#^#...#\n#######' },
      },
    ],
    musterloesung:
      'public void treppeHoch()\n{\n    do\n    {\n        schritt();\n    }\n    while(hindernisRechts());\n    rechtsDrehen();\n    schritt();\n}',
    fehlvarianten: [
      {
        quelltext: 'public void treppeHoch()\n{\n    do\n    {\n        schritt();\n    }\n    while(!hindernisRechts());\n    rechtsDrehen();\n    schritt();\n}',
        muster: 'logik.verneinung',
        erklaerung: 'Die Laufbedingung bleibt beim Überführen gleich – hier wurde sie umgedreht.',
      },
    ],
    struktur: { muss: ['do-while'], verboten: ['while'] },
    hinweise: [
      'Was ändert sich beim Überführen – und was bleibt gleich?',
      'Die Laufbedingung bleibt dieselbe; sie wandert nur vom Kopf an den Fuß: do { … } while(Laufbedingung);',
      'Achte auf das Semikolon hinter while(…) am Ende der fußgesteuerten Schleife.',
    ],
    quelle: 'Arbeitsblatt Struktogramme, Aufgabe 2a',
  },
  {
    id: 'p22-reihe-fressen',
    typ: 'programmieren',
    kann: ['k22-schreiben'],
    titel: 'Fliegenreihe abfressen',
    minuten: 4,
    punkte: 3,
    operator: 'implementieren',
    stellung:
      'Vor der Tarantel liegt eine lückenlose Reihe von Fliegen (je eine pro Feld); die Reihe beginnt auf dem Feld **direkt vor** ihr. Implementiere `reiheFressen()`: Die Tarantel frisst alle Fliegen der Reihe und bleibt auf dem ersten leeren Feld dahinter stehen.',
    vorlage: 'public void reiheFressen()\n{\n    \n}\n',
    methode: 'reiheFressen',
    tests: [
      { name: 'Drei Fliegen', sichtbar: true, welt: { karte: '#########\n#>FFF...#\n#########' } },
      { name: 'Eine Fliege', grenzfall: 'die Reihe besteht nur aus einer Fliege', welt: { karte: '#######\n#>F...#\n#######' } },
      { name: 'Reihe bis kurz vor die Wand', welt: { karte: '#######\n#>FFF.#\n#######' } },
    ],
    musterloesung: 'public void reiheFressen()\n{\n    do\n    {\n        schritt();\n        fliegeFressen();\n    }\n    while(fliegeVorn());\n    schritt();\n}',
    fehlvarianten: [
      {
        quelltext: 'public void reiheFressen()\n{\n    schritt();\n    while(fliegeAmPlatz())\n    {\n        fliegeFressen();\n    }\n    schritt();\n}',
        muster: 'kontrolle.if-statt-while',
        erklaerung: 'Die Schleife frisst nur auf dem ersten Feld – der Schritt zum nächsten Feld fehlt im Schleifenrumpf.',
      },
    ],
    hinweise: HINWEISE_PROGRAMM(
      'Der erste Schritt ist sicher nötig, die Zahl der weiteren unbekannt. Prüfen kannst du mit fliegeAmPlatz() oder fliegeVorn().',
      'Eine Möglichkeit: schritt(); dann solange eine Fliege am Platz liegt: fressen und weitergehen.',
    ),
  },

  // ---------- 2.3 Bedingte Anweisung ----------
  {
    id: 'p23-wand-oder-schritt',
    typ: 'programmieren',
    kann: ['k23-if'],
    titel: 'Ausweichen oder weitergehen',
    minuten: 4,
    punkte: 3,
    operator: 'implementieren',
    stellung:
      'Implementiere `einZug()`: **Wenn** vor der Tarantel ein Hindernis liegt, dreht sie sich nach links, **sonst** geht sie einen Schritt. In jedem Fall frisst sie danach eine Fliege, falls auf ihrem Platz eine liegt.',
    vorlage: 'public void einZug()\n{\n    \n}\n',
    methode: 'einZug',
    tests: [
      { name: 'Weg frei, Fliege', sichtbar: true, welt: { karte: '######\n#>F..#\n#....#\n######' } },
      { name: 'Wand davor', welt: { karte: '#####\n#...#\n#..>#\n#####' } },
      { name: 'Weg frei, keine Fliege', welt: { karte: '######\n#>...#\n######' } },
      { name: 'Wand davor, Fliege am Platz', grenzfall: 'Fliege liegt schon am Startplatz', welt: { karte: '#####\n#...#\n#..>#\n#####', fliegenUnterSpinne: 1 } },
    ],
    musterloesung:
      'public void einZug()\n{\n    if(hindernisVorn())\n    {\n        linksDrehen();\n    }\n    else\n    {\n        schritt();\n    }\n    if(fliegeAmPlatz())\n    {\n        fliegeFressen();\n    }\n}',
    fehlvarianten: [
      {
        quelltext:
          'public void einZug()\n{\n    if(hindernisVorn())\n    {\n        linksDrehen();\n    }\n    else\n    {\n        schritt();\n        if(fliegeAmPlatz())\n        {\n            fliegeFressen();\n        }\n    }\n}',
        muster: 'ablauf.grenzfall',
        erklaerung: 'Das Fressen steht im else-Zweig – nach dem Drehen wird nicht mehr nach einer Fliege gesehen.',
      },
    ],
    struktur: { muss: ['if-else'] },
    hinweise: HINWEISE_PROGRAMM(
      '„Wenn … sonst …“ ist eine doppelte Fallunterscheidung (if-else). Das Fressen kommt danach – es hängt nicht vom ersten Fall ab.',
      'if(hindernisVorn()) { … } else { … } und danach eine zweite, einfache Fallunterscheidung für die Fliege.',
    ),
    quelle: 'Skript S. 12, Aufgabe 3',
  },

  // ---------- 2.4 Logische Funktionen ----------
  {
    id: 'p24-tunnel',
    typ: 'programmieren',
    kann: ['k24-java'],
    titel: 'Durch den Tunnel',
    minuten: 6,
    punkte: 4,
    operator: 'implementieren',
    klausurnah: true,
    stellung:
      'Vor der Tarantel liegt ein Tunnel: Felder, bei denen links **und** rechts ein Hindernis liegt. Wie weit der Eingang entfernt und wie lang der Tunnel ist, ist unbekannt.\n\nImplementiere `tunnelLaufen()`: Die Tarantel läuft bis zum Tunnel, hindurch und bleibt auf dem ersten Feld hinter dem Tunnel stehen.',
    vorlage: 'public void tunnelLaufen()\n{\n    \n}\n',
    methode: 'tunnelLaufen',
    tests: [
      { name: 'Tunnel', sichtbar: true, welt: { karte: '##########\n#...###..#\n#>.......#\n#...###..#\n##########' } },
      { name: 'Langer Tunnel, direkt vorn', welt: { karte: '##########\n#.#####..#\n#>.......#\n#.#####..#\n##########' } },
      {
        name: 'Halbe Mauern vor und hinter dem Tunnel',
        grenzfall: 'vor und hinter dem Tunnel steht nur auf einer Seite ein Hindernis',
        welt: { karte: '##########\n#.##.###.#\n#>.......#\n#....##..#\n##########' },
      },
    ],
    musterloesung:
      'public void tunnelLaufen()\n{\n    while(!(hindernisLinks() && hindernisRechts()))\n    {\n        schritt();\n    }\n    while(hindernisLinks() && hindernisRechts())\n    {\n        schritt();\n    }\n}',
    fehlvarianten: [
      {
        quelltext:
          'public void tunnelLaufen()\n{\n    while(!hindernisLinks() && !hindernisRechts())\n    {\n        schritt();\n    }\n    while(hindernisLinks() && hindernisRechts())\n    {\n        schritt();\n    }\n}',
        muster: 'logik.verneinung',
        erklaerung: '!A && !B heißt „auf keiner Seite ein Hindernis“ – die Tarantel bleibt schon stehen, wenn nur auf einer Seite eins liegt. Gemeint ist !(A && B).',
      },
      {
        quelltext:
          'public void tunnelLaufen()\n{\n    while(!(hindernisLinks() && hindernisRechts()))\n    {\n        schritt();\n    }\n    while(hindernisLinks() || hindernisRechts())\n    {\n        schritt();\n    }\n}',
        muster: 'logik.und-oder',
        erklaerung: 'Im Tunnel liegt links UND rechts ein Hindernis. Mit ODER läuft die Tarantel auch an halben Mauern weiter.',
      },
    ],
    struktur: { muss: ['und', 'nicht'] },
    hinweise: HINWEISE_PROGRAMM(
      'Zwei Phasen: erst bis zum Eingang, dann bis zum Ausgang. „Im Tunnel“ heißt hindernisLinks() && hindernisRechts().',
      'Erste Schleife: solange NICHT im Tunnel → !( … && … ). Zweite Schleife: solange im Tunnel.',
    ),
    quelle: 'Skript S. 14, Aufgabe 2',
  },
  {
    id: 'p24-allee',
    typ: 'programmieren',
    kann: ['k24-java', 'k24-tabelle-ermitteln'],
    titel: 'Die Allee entlang',
    minuten: 4,
    punkte: 3,
    operator: 'implementieren',
    stellung:
      'Die Tarantel steht am Anfang einer Allee: Neben ihr stehen Bäume (Hindernisse) mal links, mal rechts, mal auf beiden Seiten, aber nie auf keiner. Implementiere `alleeEntlang()`: Sie läuft weiter, **solange auf mindestens einer Seite** ein Baum steht, und bleibt auf dem ersten Feld stehen, an dem auf beiden Seiten kein Baum mehr ist.',
    vorlage: 'public void alleeEntlang()\n{\n    \n}\n',
    methode: 'alleeEntlang',
    tests: [
      { name: 'Allee', sichtbar: true, welt: { karte: '###########\n#.#.##.#..#\n#>........#\n##.##.#...#\n###########' } },
      { name: 'Kurze Allee', welt: { karte: '#########\n##.#....#\n#>......#\n#.#.....#\n#########' } },
    ],
    musterloesung: 'public void alleeEntlang()\n{\n    while(hindernisLinks() || hindernisRechts())\n    {\n        schritt();\n    }\n}',
    fehlvarianten: [
      {
        quelltext: 'public void alleeEntlang()\n{\n    while(hindernisLinks() && hindernisRechts())\n    {\n        schritt();\n    }\n}',
        muster: 'logik.und-oder',
        erklaerung: 'Mit UND bleibt die Tarantel schon stehen, sobald nur auf einer Seite ein Baum steht.',
      },
    ],
    struktur: { muss: ['oder'] },
    hinweise: HINWEISE_PROGRAMM(
      '„Mindestens eine Seite“ – welche logische Funktion ist wahr, sobald einer der Eingänge wahr ist?',
      'while(hindernisLinks() || hindernisRechts()) { schritt(); }',
    ),
    quelle: 'Skript S. 14, Aufgabe 1',
  },

  // ---------- 2.5 Verschachtelte Kontrollstrukturen ----------
  {
    id: 'p25-einsammeln',
    typ: 'programmieren',
    kann: ['k25-schreiben'],
    titel: 'Alle Fliegen bis zur Wand',
    minuten: 6,
    punkte: 4,
    operator: 'implementieren',
    klausurnah: true,
    stellung:
      'Bis zur Wand liegen auf manchen Feldern Fliegen (höchstens eine pro Feld), auch auf dem Startfeld und auf dem letzten Feld vor der Wand kann eine liegen. Implementiere `einsammeln()`: Die Tarantel läuft bis zur Wand und frisst dabei **alle** Fliegen.',
    vorlage: 'public void einsammeln()\n{\n    \n}\n',
    methode: 'einsammeln',
    tests: [
      { name: 'Verstreute Fliegen', sichtbar: true, welt: { karte: '##########\n#>.F.FF..#\n##########' } },
      { name: 'Fliege vor der Wand', grenzfall: 'auf dem letzten Feld vor der Wand liegt eine Fliege', welt: { karte: '########\n#>.F..F#\n########' } },
      { name: 'Fliege am Start', grenzfall: 'auf dem Startfeld liegt eine Fliege', welt: { karte: '#######\n#>.F..#\n#######', fliegenUnterSpinne: 1 } },
    ],
    musterloesung:
      'public void einsammeln()\n{\n    while(!hindernisVorn())\n    {\n        if(fliegeAmPlatz())\n        {\n            fliegeFressen();\n        }\n        schritt();\n    }\n    if(fliegeAmPlatz())\n    {\n        fliegeFressen();\n    }\n}',
    fehlvarianten: [
      {
        quelltext:
          'public void einsammeln()\n{\n    while(!hindernisVorn())\n    {\n        if(fliegeAmPlatz())\n        {\n            fliegeFressen();\n        }\n        schritt();\n    }\n}',
        muster: 'ablauf.grenzfall',
        erklaerung: 'Auf dem letzten Feld vor der Wand ist die Laufbedingung schon falsch – dort wird nicht mehr nach einer Fliege gesehen.',
      },
      {
        quelltext:
          'public void einsammeln()\n{\n    while(!hindernisVorn())\n    {\n        schritt();\n        if(fliegeAmPlatz())\n        {\n            fliegeFressen();\n        }\n    }\n}',
        muster: 'ablauf.grenzfall',
        erklaerung: 'Erst gehen, dann nachsehen: Die Fliege auf dem Startfeld wird so nie gefressen.',
      },
    ],
    struktur: { muss: ['while', 'if'] },
    hinweise: [
      'Die Schleife bestimmt, wie weit gelaufen wird; in jedem Durchlauf wird neu entschieden, ob gefressen wird.',
      'Eine bedingte Anweisung im Schleifenrumpf: if(fliegeAmPlatz()) { fliegeFressen(); } – vor oder nach dem Schritt?',
      'Spiele den letzten Durchlauf durch: Wird auf dem Feld direkt vor der Wand noch nachgesehen?',
    ],
  },
  {
    id: 'p25-umgehen',
    typ: 'programmieren',
    kann: ['k25-schreiben', 'k21-hilfsmethoden'],
    titel: 'Fliege suchen, Hindernisse umgehen',
    minuten: 7,
    punkte: 5,
    operator: 'implementieren',
    klausurnah: true,
    stellung:
      'In Blickrichtung liegt irgendwo eine Fliege. Auf dem Weg stehen einzelne Hindernisse (je ein Feld groß); oberhalb ist immer genug Platz. Die Hilfsmethode `umgehen()` ist fertig: Sie führt die Tarantel oben um ein Hindernis herum, bis sie dahinter wieder in Blickrichtung steht.\n\nImplementiere `fliegeSuchen()`, die die Fliege findet und frisst.',
    vorlage:
      'public void fliegeSuchen()\n{\n    \n}\n\nprivate void umgehen()\n{\n    linksDrehen();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    linksDrehen();\n}\n',
    methode: 'fliegeSuchen',
    tests: [
      { name: 'Ein Hindernis', sichtbar: true, welt: { karte: '#########\n#.......#\n#>.#..F.#\n#########' } },
      { name: 'Zwei Hindernisse', welt: { karte: '###########\n#.........#\n#>#..#.F..#\n###########' } },
      { name: 'Kein Hindernis', welt: { karte: '########\n#......#\n#>...F.#\n########' } },
      {
        name: 'Fliege direkt hinter dem Hindernis',
        grenzfall: 'nach dem Umgehen steht die Tarantel schon auf der Fliege',
        welt: { karte: '#########\n#.......#\n#>.#F...#\n#########' },
      },
    ],
    musterloesung:
      'public void fliegeSuchen()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            umgehen();\n        }\n        else\n        {\n            schritt();\n        }\n    }\n    fliegeFressen();\n}\n\nprivate void umgehen()\n{\n    linksDrehen();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    linksDrehen();\n}',
    fehlvarianten: [
      {
        quelltext:
          'public void fliegeSuchen()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            umgehen();\n        }\n        schritt();\n    }\n    fliegeFressen();\n}\n\nprivate void umgehen()\n{\n    linksDrehen();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    linksDrehen();\n}',
        muster: 'kontrolle.if-statt-while',
        erklaerung: 'Ohne else geht die Tarantel nach dem Umgehen noch einen Schritt – und kann so über die Fliege hinweglaufen.',
      },
    ],
    struktur: { muss: ['while', 'if-else', 'hilfsmethode'] },
    hinweise: [
      'Das ist das Beispiel aus dem Video zu verschachtelten Kontrollstrukturen.',
      'Solange keine Fliege am Platz liegt, gibt es in jedem Durchlauf genau zwei Möglichkeiten: umgehen oder einen Schritt gehen.',
      'while(!fliegeAmPlatz()) { if(hindernisVorn()) { … } else { … } } und danach fressen.',
    ],
    quelle: 'Video „Verschachtelte Kontrollstrukturen“',
  },
  {
    id: 'p25-rechteck',
    typ: 'programmieren',
    kann: ['k25-schreiben'],
    titel: 'Fliegen im Quadrat auslegen',
    minuten: 5,
    punkte: 4,
    operator: 'implementieren',
    stellung:
      'Die Tarantel hat genug Fliegen im Bauch. Implementiere `quadrat()`: Sie legt den Rand eines Quadrats aus Fliegen. Dazu geht sie **viermal** dasselbe Muster: dreimal „Fliege ausspucken, Schritt“, dann nach rechts drehen. Verwende eine **Zählschleife**.',
    vorlage: 'public void quadrat()\n{\n    \n}\n',
    methode: 'quadrat',
    tests: [
      { name: 'Freie Fläche', sichtbar: true, welt: { karte: '########\n#>.....#\n#......#\n#......#\n#......#\n########', gefressen: 20 } },
      { name: 'Andere Position', welt: { karte: '#######\n#.....#\n#.>...#\n#.....#\n#.....#\n#.....#\n#######', gefressen: 12 } },
    ],
    musterloesung:
      'public void quadrat()\n{\n    for(int i = 0; i < 4; i++)\n    {\n        for(int j = 0; j < 3; j++)\n        {\n            fliegeAusspucken();\n            schritt();\n        }\n        rechtsDrehen();\n    }\n}',
    struktur: { muss: ['for'] },
    hinweise: [
      'Was wird viermal wiederholt? Und was darin dreimal?',
      'Zählschleife: for(int i = 0; i < 4; i++) { … } – darin entweder eine zweite Zählschleife oder dreimal die beiden Anweisungen.',
      'Nach den drei Seitenfeldern kommt rechtsDrehen() – noch in der äußeren Schleife.',
    ],
    quelle: 'Skript S. 19, Aufgabe 4',
  },

  // ---------- Fehler finden ----------
  {
    id: 'f22-schreibfehler',
    typ: 'programmieren',
    kann: ['k22-schreiben', 'k21-einruecken'],
    titel: 'Fehler finden: Schleife zur Wand',
    minuten: 4,
    punkte: 3,
    operator: 'modifizieren',
    stellung:
      'Die Methode soll die Tarantel bis zur Wand laufen lassen und dort umdrehen. Sie enthält **drei Fehler**. Finde und korrigiere sie – ohne Ausführen.',
    vorlage: 'public void zurWand()\n{\n    while(!hindernisVorn());\n    {\n        schritt()\n    }\n    linksdrehen();\n    linksDrehen();\n}\n',
    methode: 'zurWand',
    tests: [
      { name: 'Gang', sichtbar: true, welt: { karte: '#########\n#>......#\n#########' } },
      { name: 'Direkt vor der Wand', grenzfall: 'die Tarantel steht schon vor der Wand', welt: { karte: '#####\n#..>#\n#####' } },
    ],
    musterloesung: 'public void zurWand()\n{\n    while(!hindernisVorn())\n    {\n        schritt();\n    }\n    linksDrehen();\n    linksDrehen();\n}',
    hinweise: [
      'Lies Zeile für Zeile und achte auf drei Dinge: Semikolons, Groß-/Kleinschreibung und was direkt hinter while(…) steht.',
      'Ein Semikolon direkt hinter while(…) beendet die Schleife sofort.',
      'Fehler stecken in den Zeilen 3, 5 und 7.',
    ],
  },
  {
    id: 'f25-endlos',
    typ: 'programmieren',
    kann: ['k25-schreiben', 'k25-lesen'],
    titel: 'Fehler finden: Die Tarantel hängt',
    minuten: 4,
    punkte: 3,
    operator: 'modifizieren',
    stellung:
      'Die Tarantel soll bis zur Fliege laufen und an Hindernissen links abbiegen. In Greenfoot bleibt das Programm aber hängen. Finde den Denkfehler und korrigiere die Methode.',
    vorlage:
      'public void fliegeFinden()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            linksDrehen();\n        }\n    }\n    fliegeFressen();\n}\n',
    methode: 'fliegeFinden',
    tests: [
      { name: 'Ecke', sichtbar: true, welt: { karte: '#######\n#.F...#\n#.....#\n#.....#\n#>....#\n#######' } },
      { name: 'Gerade', welt: { karte: '#######\n#>..F.#\n#######' } },
    ],
    musterloesung:
      'public void fliegeFinden()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            linksDrehen();\n        }\n        else\n        {\n            schritt();\n        }\n    }\n    fliegeFressen();\n}',
    hinweise: [
      'Was ändert sich im Schleifenrumpf, wenn vorne kein Hindernis liegt?',
      'Eine Schleife endet nur, wenn sich im Rumpf etwas ändert, wovon die Laufbedingung abhängt.',
      'Es fehlt ein else-Zweig.',
    ],
  },
];
