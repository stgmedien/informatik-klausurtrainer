import type { Lektion } from '../typen';

const V8 = 'Video „Struktogramme modellieren“, Arbeitsblatt 08-1';

export const BEISPIEL_FLIEGE_FINDEN =
  'public void fliegeFinden()\n{\n    while(!fliegeAmPlatz())\n    {\n        if(hindernisVorn())\n        {\n            umgehen();\n        }\n        else\n        {\n            schritt();\n        }\n    }\n    fliegeFressen();\n}\n\nprivate void umgehen()\n{\n    linksDrehen();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    schritt();\n    rechtsDrehen();\n    schritt();\n    linksDrehen();\n}';

const BAUSTEINE =
  'public void bausteine()\n{\n    schritt();\n    if(klatscheVorn())\n    {\n        linksDrehen();\n    }\n    else\n    {\n        schritt();\n    }\n    while(hindernisRechts())\n    {\n        schritt();\n    }\n    do\n    {\n        fliegeAusspucken();\n    }\n    while(fliegeGefressen());\n    for(int i = 0; i < 3; i++)\n    {\n        schritt();\n    }\n}';

export const LEKTIONEN_B26: Lektion[] = [
  {
    id: 'l26-bausteine',
    kann: ['k26-lesen', 'k26-modellieren', 'k26-ueberfuehren'],
    titel: 'Struktogramme: die Bausteine',
    minuten: 5,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Ein **Struktogramm** (Nassi-Shneiderman-Diagramm) stellt einen Algorithmus grafisch dar. Es hilft, ein Programm zu **planen**, bevor man es schreibt – unabhängig von der Programmiersprache. Methodennamen und Java-Syntax sind dabei nicht wichtig, sondern der gedankliche Kern: Welche Befehle kommen in welcher Reihenfolge, was wird wiederholt, was hängt von einer Bedingung ab?',
      },
      {
        art: 'merksatz',
        id: 'm-struktogramm',
        titel: 'Struktogramm',
        text: 'Ein Struktogramm stellt einen Algorithmus programmiersprachenunabhängig dar. Es wird wie eine Methode von oben nach unten gelesen. Bedingungen werden umgangssprachlich als Frage formuliert, z.B. „Ist ein Hindernis vor mir?“.',
        quelle: V8,
      },
      {
        art: 'material',
        material: { art: 'struktogramm', quelltext: BAUSTEINE, methode: 'bausteine', titel: 'Alle Bausteine in einem Struktogramm' },
      },
      {
        art: 'text',
        markdown:
          '| Baustein | So sieht er aus | Java |\n|---|---|---|\n| **Anweisung** | Rechteck mit einem Befehl | `schritt();` |\n| **Verzweigung** | Dreieck mit der Bedingung als Frage, darunter zwei Spalten: links *Wahr*, rechts *Falsch*. Ein leerer Zweig bekommt **∅**. | `if(…) { … } else { … }` |\n| **Kopfgesteuerte Schleife** | Bedingung oben, darunter der eingerückte Rumpf (L-Form) | `while(…) { … }` |\n| **Fußgesteuerte Schleife** | Rumpf oben, Bedingung unten (umgedrehte L-Form) | `do { … } while(…);` |\n| **Zählschleife** | wie die kopfgesteuerte, oben steht, wie gezählt wird | `for(int i = 0; i < 3; i++) { … }` |\n| **Aufruf** | Rechteck mit zwei senkrechten Balken links und rechts – für eine eigene Methode | `umgehen();` |',
      },
      {
        art: 'merksatz',
        id: 'm-struktogramm-bausteine',
        titel: 'Bausteine',
        text: 'Anweisung (Rechteck), Verzweigung (Dreieck mit Frage, links Wahr, rechts Falsch, leerer Zweig ∅), kopfgesteuerte Schleife (Bedingung oben), fußgesteuerte Schleife (Bedingung unten), Zählschleife, Aufruf einer eigenen Methode (Rechteck mit seitlichen Balken). Alles, was im Winkel einer Schleife steht, wird wiederholt.',
        quelle: V8,
      },
      {
        art: 'text',
        markdown:
          '**Farben:** In den Arbeitsblättern sind Schleifen mint, Verzweigungen lachsfarben und Anweisungen beige. In der Klausur zeichnest du schwarz-weiß – entscheidend sind Form und Verschachtelung.\n\n**Beschriftung der Verzweigung:** Im Arbeitsblatt steht „Wahr / Falsch“, im Video „Ja / Nein“. Beides ist richtig; in den Einstellungen kannst du wählen, was die App zeigt.',
      },
    ],
  },
  {
    id: 'l26-ueberfuehren',
    kann: ['k26-ueberfuehren', 'k26-lesen'],
    titel: 'Struktogramm ↔ Quelltext',
    minuten: 4,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Beim **Überführen** bleibt die Logik gleich, nur die Darstellung ändert sich. Jeder Baustein hat genau eine Entsprechung in Java. Das Beispiel aus dem Video: Die Tarantel findet eine Fliege in Blickrichtung und umgeht dabei Hindernisse.',
      },
      { art: 'material', material: { art: 'struktogramm', quelltext: BEISPIEL_FLIEGE_FINDEN, methode: 'fliegeFinden', mitHilfsmethoden: true } },
      { art: 'material', material: { art: 'code', quelltext: BEISPIEL_FLIEGE_FINDEN, titel: 'Derselbe Algorithmus in Java' } },
      {
        art: 'text',
        markdown:
          '**Struktogramm → Java**, Baustein für Baustein von oben nach unten:\n\n1. Frage in der Bedingung in die passende Prüfmethode übersetzen, „kein/keine“ wird zu `!`.\n2. Kopfgesteuerte Schleife → `while(…) { }`, fußgesteuerte → `do { } while(…);`, Verzweigung → `if(…) { } else { }`.\n3. Was im Winkel bzw. im Zweig steht, kommt zwischen die geschweiften Klammern – eine Stufe eingerückt.\n4. Ein Aufruf-Baustein wird zum Aufruf `umgehen();` und die Methode selbst muss definiert werden.\n\n**Java → Struktogramm** geht genauso rückwärts: Jede Kontrollstruktur wird zum Baustein, ihr Inhalt wird hineingezeichnet.',
      },
      {
        art: 'merksatz',
        id: 'm-ueberfuehren',
        titel: 'Überführen',
        text: 'Beim Überführen wird eine Darstellung in eine andere gebracht; die Logik bleibt gleich. Kopfgesteuerte Schleife ↔ while, fußgesteuerte ↔ do-while, Verzweigung ↔ if-else, Aufruf ↔ Methodenaufruf. Der Inhalt eines Bausteins steht in Java zwischen den geschweiften Klammern.',
        quelle: 'Arbeitsblatt 08-1, Aufgabe 2',
      },
    ],
  },
];
