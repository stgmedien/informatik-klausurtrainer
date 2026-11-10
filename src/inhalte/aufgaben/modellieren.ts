import type { Aufgabe, Lektion } from '../typen';

export const LEKTION_MODELLIEREN: Lektion = {
  id: 'l1-modellieren',
  kann: ['k1-modellieren'],
  titel: 'Ein Klassendiagramm modellieren',
  minuten: 4,
  abschnitte: [
    {
      art: 'text',
      markdown:
        'In der Klausur kann verlangt sein, zu einer Beschreibung ein eigenes Klassendiagramm zu **modellieren** – mit sinnvoller Vererbung. So gehst du vor:\n\n1. **Klassen finden:** Welche Arten von Dingen kommen vor? Meist sind es Substantive (Tier, Löwe, Pinguin).\n2. **Attribute und Methoden sammeln:** Eigenschaften werden Attribute (`- name : String`), Fähigkeiten werden Methoden (`+ fressen()`).\n3. **Gemeinsamkeiten nach oben ziehen (Generalisierung):** Was mehrere Klassen gemeinsam haben, gehört in eine gemeinsame Oberklasse – und dort nur einmal hin.\n4. **Besonderheiten nach unten (Spezialisierung):** Was nur eine Klasse kann oder hat, steht nur in dieser Unterklasse.\n5. **Ist-ein-Test:** Für jeden Vererbungspfeil muss der Satz „Ein Löwe ist ein Tier“ stimmen.\n6. **Zeichnen:** Pfeil mit leerer Dreiecksspitze von der Unterklasse zur Oberklasse.',
    },
    {
      art: 'merksatz',
      id: 'm-modellieren',
      titel: 'Modellieren mit Vererbung',
      text: 'Gemeinsame Attribute und Methoden stehen nur einmal in der Oberklasse (Generalisierung). Unterklassen enthalten nur ihre zusätzlichen Attribute und Methoden (Spezialisierung) – Geerbtes wird dort nicht noch einmal eingetragen.',
      quelle: 'abgeleitet aus dem Video „Vererbung in Java“',
    },
    {
      art: 'merksatz',
      id: 'm-uml-schreibweise',
      titel: 'Schreibweise im Klassendiagramm',
      text: 'Drei Fächer: Klassenname, Attribute, Methoden. Attribut: − name : Typ (− = private). Methode: + name(Parameter) : Rückgabetyp (+ = public). Vererbung: Pfeil mit leerer Dreiecksspitze von der Unterklasse zur Oberklasse.',
      quelle: 'Skript S. 5 und S. 25 (Klassendiagramme Auto, Apfel, Frosch); Pfeilform nach UML',
      abgleichen: true,
    },
    {
      art: 'text',
      markdown:
        '**Typische Fehler:** dasselbe Attribut in Ober- und Unterklasse eintragen · Pfeil in die falsche Richtung (er zeigt immer zur allgemeineren Klasse) · „hat-ein“-Beziehungen als Vererbung zeichnen (Ein Auto *hat* Räder – ein Rad *ist* kein Auto).',
    },
  ],
};

export const AUFGABEN_MODELLIEREN: Aufgabe[] = [
  {
    id: 'm1-zoo',
    typ: 'klassen-modellieren',
    kann: ['k1-modellieren', 'k1-vererbung'],
    titel: 'Zoo modellieren',
    minuten: 10,
    punkte: 6,
    operator: 'modellieren',
    klausurnah: true,
    stellung:
      'Für die Verwaltung eines Zoos soll ein Programm entstehen. Jedes Tier hat einen Namen und ein Alter; alle Tiere können fressen und schlafen. **Löwen** können zusätzlich brüllen. **Pinguine** können zusätzlich schwimmen und haben eine Ringnummer. **Papageien** können sprechen und haben einen Wortschatz (Anzahl der Wörter).\n\nModelliere ein Klassendiagramm, das das Konzept der Vererbung sinnvoll anwendet.',
    pflichtklassen: ['Tier', 'Loewe', 'Pinguin', 'Papagei'],
    erwartung: {
      musterantwort:
        'Klasse Tier\n  Attribute: - name : String; - alter : int\n  Methoden: + fressen(); + schlafen()\nKlasse Loewe (Unterklasse von Tier)\n  Attribute: –\n  Methoden: + bruellen()\nKlasse Pinguin (Unterklasse von Tier)\n  Attribute: - ringnummer : int\n  Methoden: + schwimmen()\nKlasse Papagei (Unterklasse von Tier)\n  Attribute: - wortschatz : int\n  Methoden: + sprechen()',
      kriterien: [
        { id: 'ober', text: 'Gemeinsame Oberklasse (z.B. Tier) mit name und alter sowie fressen() und schlafen() – Generalisierung', punkte: 2 },
        { id: 'unter', text: 'Löwe, Pinguin und Papagei sind Unterklassen dieser Oberklasse (Vererbung in die richtige Richtung)', punkte: 1 },
        { id: 'spezial', text: 'Jede Unterklasse hat nur ihre besonderen Attribute/Methoden (bruellen; schwimmen + ringnummer; sprechen + wortschatz) – Spezialisierung', punkte: 2 },
        { id: 'keine-doppel', text: 'Geerbte Attribute und Methoden werden in den Unterklassen nicht noch einmal eingetragen; Namen/Datentypen sinnvoll', punkte: 1 },
      ],
    },
    hinweise: [
      'Was haben alle Tiere gemeinsam? Das gehört in eine Oberklasse.',
      'Jede Tierart bekommt eine eigene Unterklasse mit nur dem, was sie zusätzlich hat oder kann.',
      'Klassennamen ohne Umlaute schreiben (Loewe); die Unterklassen erben von Tier.',
    ],
  },
  {
    id: 'm1-spinnen',
    typ: 'klassen-modellieren',
    kann: ['k1-modellieren'],
    titel: 'Die Spinnenwelt erweitern',
    minuten: 8,
    punkte: 5,
    operator: 'modellieren',
    klausurnah: true,
    stellung:
      'In der Spinnenwelt gibt es die Klasse `Spinne` mit dem Attribut `fliegen : int` und den Methoden `schritt()`, `linksDrehen()` und `fliegeFressen()`. Neu hinzukommen sollen:\n\n- **Taranteln**, die zusätzlich `wenden()` können,\n- **Wolfsspinnen**, die zusätzlich `springen()` können und eine `sprungweite : int` haben.\n\nModelliere das Klassendiagramm mit den drei Klassen.',
    pflichtklassen: ['Spinne', 'Tarantel', 'Wolfsspinne'],
    erwartung: {
      musterantwort:
        'Klasse Spinne\n  Attribute: - fliegen : int\n  Methoden: + schritt(); + linksDrehen(); + fliegeFressen()\nKlasse Tarantel (Unterklasse von Spinne)\n  Attribute: –\n  Methoden: + wenden()\nKlasse Wolfsspinne (Unterklasse von Spinne)\n  Attribute: - sprungweite : int\n  Methoden: + springen()',
      kriterien: [
        { id: 'spinne', text: 'Spinne mit fliegen, schritt(), linksDrehen(), fliegeFressen()', punkte: 1 },
        { id: 'erben', text: 'Tarantel und Wolfsspinne erben beide von Spinne (Pfeil zur Oberklasse), nicht voneinander', punkte: 1 },
        { id: 'tarantel', text: 'Tarantel enthält nur zusätzlich wenden()', punkte: 1 },
        { id: 'wolfsspinne', text: 'Wolfsspinne enthält zusätzlich sprungweite : int und springen()', punkte: 1 },
        { id: 'nicht-doppelt', text: 'Geerbte Attribute und Methoden stehen nicht noch einmal in den Unterklassen', punkte: 1 },
      ],
    },
    hinweise: [
      'Wende den Ist-ein-Test an: Ist eine Wolfsspinne eine Tarantel?',
      'Beide neuen Klassen sind Geschwister: Sie erben von derselben Oberklasse.',
      'In die Unterklassen kommt nur, was neu ist.',
    ],
  },
];
