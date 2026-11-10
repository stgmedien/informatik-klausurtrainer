import type { Lektion } from '../typen';

const V7 = 'Video „Verschachtelte Kontrollstrukturen, Einrückung und Debugger“';

export const LEKTIONEN_B25: Lektion[] = [
  {
    id: 'l25-verschachtelt',
    kann: ['k25-lesen', 'k25-schreiben', 'k25-einruecken'],
    titel: 'Verschachtelte Kontrollstrukturen',
    minuten: 4,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Kontrollstrukturen lassen sich beliebig ineinander **verschachteln**: eine Verzweigung in einer Schleife, eine Schleife in einer Verzweigung, eine Schleife in einer Schleife. Das Beispiel aus dem Video – die Tarantel sucht eine Fliege und umgeht Hindernisse:',
      },
      {
        art: 'material',
        material: {
          art: 'code',
          titel: 'fliegeSuchen()',
          quelltext:
            'public void fliegeSuchen()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            umgehen();\n        }\n        else\n        {\n            schritt();\n        }\n    }\n    fliegeFressen();\n}',
        },
      },
      {
        art: 'text',
        markdown:
          '**So läuft es ab:** Der Schleifenkopf prüft die Laufbedingung. Ist sie wahr, springt das Programm in den Rumpf und dort in **genau einen** der beiden Fälle (if oder else). Danach geht es hinter der if-else-Anweisung weiter – das ist das Ende des Rumpfs, also zurück zum Schleifenkopf. Erst wenn die Laufbedingung falsch ist, geht es hinter der Schleife weiter: `fliegeFressen()`.',
      },
      {
        art: 'merksatz',
        id: 'm-verschachteln',
        titel: 'Verschachteln',
        text: 'Kontrollstrukturen können beliebig ineinander verschachtelt werden. Die innere Struktur wird bei jedem Durchlauf der äußeren vollständig abgearbeitet.',
        quelle: V7,
      },
      {
        art: 'merksatz',
        id: 'm-einruecken-verschachtelt',
        titel: 'Einrücken beim Verschachteln',
        text: 'Jedes Konstrukt mit geschweiften Klammern (Methode, while, if, else, for, do) steht mit seiner öffnenden und schließenden Klammer auf derselben Höhe. Alles dazwischen wird einen Tab nach rechts eingerückt. So erkennt man auf einen Blick, was wozu gehört.',
        quelle: V7,
      },
      {
        art: 'text',
        markdown:
          '**Auf Papier besonders wichtig:** Schreibe zu jeder öffnenden Klammer sofort die schließende darunter – auf derselben Höhe – und fülle dann den Inhalt dazwischen. Dann kann keine Klammer fehlen.\n\n**Lesen:** Fahre bei verschachteltem Code mit dem Finger die Einrückung entlang: Alles, was weiter rechts steht, gehört zu der Zeile darüber, die weniger weit eingerückt ist.',
      },
    ],
  },
];
