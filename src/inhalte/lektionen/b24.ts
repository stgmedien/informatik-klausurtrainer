import type { Lektion } from '../typen';

const V6 = 'Video „Logische Funktionen in Java“, Skript S. 13 und Anhang A';

export const LEKTIONEN_B24: Lektion[] = [
  {
    id: 'l24-funktionen',
    kann: ['k24-tabellen', 'k24-java'],
    titel: 'Die sechs logischen Funktionen',
    minuten: 4,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Prüfmethoden wie `fliegeAmPlatz()` liefern einen **Wahrheitswert**: `true` (wahr, 1) oder `false` (falsch, 0). Hängt ein Anweisungsblock von **mehreren** Bedingungen ab, verknüpft man sie mit **logischen Funktionen**. Was eine Funktion liefert, zeigt ihre **Wertetabelle** (Wahrheitstabelle): links alle Kombinationen der Eingänge, rechts das Ergebnis Y.',
      },
      {
        art: 'text',
        markdown:
          '| Funktion | in Worten | Java | A=0 B=0 | A=0 B=1 | A=1 B=0 | A=1 B=1 |\n|---|---|---|---|---|---|---|\n| **UND** (AND) | nur wahr, wenn **beide** wahr sind | `A && B` | 0 | 0 | 0 | **1** |\n| **ODER** (OR) | wahr, sobald **mindestens einer** wahr ist | `A \\|\\| B` | 0 | **1** | **1** | **1** |\n| **NICHT UND** (NAND) | Ergebnis von UND umgedreht | `!(A && B)` | **1** | **1** | **1** | 0 |\n| **NICHT ODER** (NOR) | Ergebnis von ODER umgedreht: nur wahr, wenn **beide falsch** sind | `!(A \\|\\| B)` | **1** | 0 | 0 | 0 |\n| **EXKLUSIV-ODER** (XOR) | wahr, wenn **genau einer** wahr ist | `!A && B \\|\\| A && !B` | 0 | **1** | **1** | 0 |\n\n**NICHT** (NOT) hat nur einen Eingang und dreht ihn um: aus 0 wird 1, aus 1 wird 0. In Java: `!A`.',
      },
      {
        art: 'merksatz',
        id: 'm-logische-funktionen',
        titel: 'Logische Funktionen in Java',
        text: 'NICHT: !A · UND: A && B · ODER: A || B · NICHT UND: !(A && B) · NICHT ODER: !(A || B) · EXKLUSIV-ODER: !A && B || A && !B. Für NAND, NOR und XOR gibt es kein eigenes Zeichen – sie werden aus !, && und || zusammengesetzt.',
        quelle: V6,
      },
      {
        art: 'text',
        markdown:
          '**Eselsbrücken aus dem Unterricht:** UND – „Ich gehe zum Sport, wenn ich Zeit habe **und** mein Freund Zeit hat.“ ODER – „Ich treffe mich, wenn **einer** meiner Freunde Zeit hat“ (auch wenn beide Zeit haben).\n\n**Schreibweisen:** Das Skript notiert Formeln mit ∧ (UND), ∨ (ODER), ⊕ (XOR) und einem Überstrich für NICHT. In dieser App steht statt des Überstrichs das Zeichen ¬.',
      },
    ],
  },
  {
    id: 'l24-praezedenz',
    kann: ['k24-praezedenz', 'k24-praezedenz-anwenden'],
    titel: 'Präzedenzen: Was wird zuerst ausgewertet?',
    minuten: 3,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'In der Mathematik gilt Punkt- vor Strichrechnung: `2 + 3 · 4 = 14`, nicht 20. Bei logischen Ausdrücken gibt es dieselbe Art von Rangfolge – die **Präzedenzen**:',
      },
      {
        art: 'merksatz',
        id: 'm-praezedenz',
        titel: 'Präzedenzen logischer Funktionen',
        text: '0. Klammerung · 1. Negation (NICHT) · 2. Konjunktion (UND) · 3. Disjunktion (ODER). UND bindet stärker als ODER – so wie Punktrechnung vor Strichrechnung kommt. Gleichrangige Operatoren werden von links nach rechts ausgewertet.',
        quelle: V6,
      },
      {
        art: 'text',
        markdown:
          '**Durchgerechnet** für `!A && B || A && !B` mit A = true, B = false:\n\n```\n!true && false || true && !false      Werte einsetzen\nfalse && false || true && true        1. alle Negationen\nfalse          || true                2. alle UND\ntrue                                  3. ODER\n```\n\n**So gehst du auf Papier vor:** Schreibe den Ausdruck ab und setze die Werte ein. Erledige pro Zeile eine Rangstufe und schreibe den verkürzten Ausdruck darunter. So siehst du jederzeit, was noch offen ist.',
      },
      {
        art: 'text',
        markdown:
          '**Die typische Falle:** stur von links nach rechts rechnen. Bei `A || B && !C` mit A = true, B = false, C = true käme so heraus: `true || false` = true, dann `true && !true` = **false**. Richtig ist: erst `!C` = false, dann `B && false` = false, zuletzt `true || false` = **true**.\n\n**Mehr als zwei Werte:** `hindernisLinks() && hindernisRechts() && hindernisVorn()` (Sackgasse) wird von links nach rechts ausgewertet – erst die beiden ersten, das Zwischenergebnis dann mit dem dritten.',
      },
    ],
  },
  {
    id: 'l24-sensoren',
    kann: ['k24-tabelle-ermitteln', 'k24-java'],
    titel: 'Von der Aufgabe zur Bedingung',
    minuten: 3,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Klausuraufgaben beschreiben oft eine Situation in Worten. In drei Schritten kommst du zur Java-Bedingung:\n\n1. **Bedingungen benennen.** Welche Sensoren spielen eine Rolle? Zum Beispiel A = `hindernisLinks()`, B = `hindernisRechts()`.\n2. **Wertetabelle aufstellen.** Gehe alle Kombinationen durch und trage ein, ob die Aktion passieren soll.\n3. **Funktion erkennen und in Java schreiben.** Vergleiche die Ergebnisspalte mit den sechs Grundtabellen.',
      },
      {
        art: 'text',
        markdown:
          '**Beispiel Tunnel** (Skript S. 13): Die Tarantel soll weiterlaufen, solange links **und** rechts ein Hindernis liegt.\n\n| Hindernis links | Hindernis rechts | Schritt |\n|---|---|---|\n| false | false | false |\n| false | true | false |\n| true | false | false |\n| true | true | **true** |\n\nNur die letzte Zeile ist wahr → **UND**:\n\n```java\nwhile(hindernisLinks() && hindernisRechts())\n{\n    schritt();\n}\n```',
      },
      {
        art: 'merksatz',
        id: 'm-tabelle-ermitteln',
        titel: 'Wertetabelle ermitteln',
        text: 'Bei n Bedingungen hat die Tabelle 2ⁿ Zeilen (2 Bedingungen → 4 Zeilen, 3 → 8). Die Zeilen werden wie beim Zählen geordnet: 00, 01, 10, 11. Für jede Zeile entscheidet man anhand der Aufgabenstellung, ob das Ergebnis wahr oder falsch ist.',
        quelle: 'Skript S. 13, Anhang A',
      },
      {
        art: 'text',
        markdown:
          '**Achtung bei Verneinungen:** `!(A || B)` (NOR: keins von beiden) ist etwas anderes als `!A || !B` (mindestens eins fehlt, das ist NAND). Die Klammer entscheidet, worauf sich das `!` bezieht.',
      },
    ],
  },
];
