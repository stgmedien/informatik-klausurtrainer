import type { Lektion } from '../typen';

const V3 = 'Video „Aufbau einer Klassendefinition“, Skript S. 6–8';
const V4 = 'Video „while und do while Schleifen“, Skript S. 9–10';
const V5 = 'Video „if und if else Anweisung“, Skript S. 11–12';

export const BEISPIELKLASSE = `import greenfoot.*;

/* Die Tarantel ist eine Spinne
   mit zusätzlichen Fähigkeiten. */
public class Tarantel extends Spinne
{
    private int gegangen;

    public void wenden()
    {
        // zweimal links = halbe Drehung
        linksDrehen();
        linksDrehen();
    }

    public void act()
    {
        schritt();
        wenden();
    }
}`;

export const LEKTIONEN_B21_B23: Lektion[] = [
  {
    id: 'l21-aufbau',
    kann: ['k21-aufbau', 'k21-hilfsmethoden', 'k21-kommentare', 'k21-einruecken'],
    titel: 'Aufbau einer Java-Klasse',
    minuten: 4,
    abschnitte: [
      { art: 'material', material: { art: 'code', quelltext: BEISPIELKLASSE, titel: 'Tarantel.java' } },
      {
        art: 'text',
        markdown:
          'Von oben nach unten besteht die Klasse aus:\n\n1. **Import-Anweisung** – `import greenfoot.*;` bindet fertige Pakete ein.\n2. **Klassenkopf** – `public class Tarantel extends Spinne`: Sichtbarkeit, das Wort `class`, der Klassenname (großer Anfangsbuchstabe) und mit `extends` die Oberklasse.\n3. **Attribute** – stehen in der Klasse ganz oben, z.B. `private int gegangen;`.\n4. **Methoden** – darunter, z.B. `wenden()` und `act()`.\n\nAlles, was zur Klasse gehört, steht zwischen ihrer öffnenden und schließenden geschweiften Klammer. Dasselbe gilt für jede Methode.',
      },
      {
        art: 'merksatz',
        id: 'm-klassenaufbau',
        titel: 'Aufbau einer Klasse',
        text: 'Eine Java-Klasse besteht aus Import-Anweisungen, dem Klassenkopf (Sichtbarkeit, class, Name, extends Oberklasse) und dem Klassenrumpf in geschweiften Klammern. Im Rumpf stehen zuerst die Attribute, dann die Methoden.',
        quelle: V3,
      },
      {
        art: 'merksatz',
        id: 'm-methodenkopf',
        titel: 'Aufbau einer Methode',
        text: 'Der Methodenkopf besteht aus Sichtbarkeit (public oder private), Rückgabetyp (void = gibt nichts zurück), Bezeichner (Name) und Parameterliste in runden Klammern, z.B. public void wenden(). Danach folgt in geschweiften Klammern der Rumpf mit den Anweisungen.',
        quelle: V3,
      },
      {
        art: 'merksatz',
        id: 'm-hilfsmethode',
        titel: 'Hilfsmethode',
        text: 'Eine Hilfsmethode ist eine selbst geschriebene Methode, die eine Teilaufgabe erledigt (z.B. wenden) und von anderen Methoden aufgerufen wird. So muss man wiederkehrende Befehlsfolgen nur einmal schreiben.',
        quelle: 'Skript S. 8',
      },
      {
        art: 'merksatz',
        id: 'm-kommentar',
        titel: 'Kommentare',
        text: 'Einzeilige Kommentare beginnen mit // und reichen bis zum Zeilenende. Mehrzeilige Kommentare stehen zwischen /* und */. Der Compiler ignoriert Kommentare; sie machen den Quelltext für Menschen verständlicher.',
        quelle: V3,
      },
      {
        art: 'merksatz',
        id: 'm-einruecken',
        titel: 'Einrücken',
        text: 'Ein Konstrukt (Klasse, Methode, Schleife, if) und seine beiden geschweiften Klammern stehen auf derselben Höhe. Alles zwischen den Klammern wird um einen Tabulator nach rechts eingerückt: Eingerückt heißt logisch untergeordnet.',
        quelle: 'Videos „Aufbau einer Klassendefinition“ und „Verschachtelte Kontrollstrukturen“',
      },
      {
        art: 'text',
        markdown:
          '**Auf Papier besonders fehleranfällig:** das Semikolon hinter jeder Anweisung, die runden Klammern hinter jedem Methodennamen (`schritt();` nicht `schritt;`) und die Groß-/Kleinschreibung (`linksDrehen`, nicht `linksdrehen`).',
      },
    ],
  },
  {
    id: 'l21-begriffe',
    kann: ['k21-begriffe'],
    titel: 'Algorithmus, Anweisung, Sequenz',
    minuten: 2,
    abschnitte: [
      {
        art: 'merksatz',
        id: 'm-anweisung',
        titel: 'Anweisung',
        text: 'Eine Anweisung ist ein einziger ausführbarer Befehl, z.B. schritt();',
        quelle: V4,
      },
      {
        art: 'merksatz',
        id: 'm-sequenz',
        titel: 'Sequenz',
        text: 'Eine Sequenz ist eine Befehlsfolge aus mehreren (2 bis n) Anweisungen. Sie werden nacheinander von oben nach unten ausgeführt.',
        quelle: V4,
      },
      {
        art: 'merksatz',
        id: 'm-algorithmus',
        titel: 'Algorithmus',
        text: 'Ein Algorithmus ist eine eindeutige Handlungsvorschrift aus endlich vielen ausführbaren Schritten, mit der ein Problem gelöst wird.',
        quelle: 'fachlich übliche Definition',
        abgleichen: true,
      },
      {
        art: 'text',
        markdown:
          '**Beispiel:** In der Methode `wenden()` ist `linksDrehen();` eine Anweisung. Die beiden Aufrufe hintereinander bilden eine Sequenz. Die Vorschrift „Geh geradeaus, bis eine Fliege am Platz liegt, und friss sie“ ist ein Algorithmus – unabhängig davon, ob er als Text, als Struktogramm oder als Java-Quelltext aufgeschrieben ist.',
      },
    ],
  },
  {
    id: 'l22-schleifen',
    kann: ['k22-kopf-fuss', 'k22-lesen', 'k22-schreiben'],
    titel: 'Kopf- und fußgesteuerte Schleifen',
    minuten: 4,
    abschnitte: [
      {
        art: 'merksatz',
        id: 'm-schleife',
        titel: 'Schleife',
        text: 'Eine Schleife ist eine Kontrollstruktur, mit der eine Anweisung oder Sequenz mehrfach wiederholt wird. Bei while-Schleifen steuert ein Wahrheitswert (wahr/falsch), wie oft wiederholt wird.',
        quelle: V4,
      },
      {
        art: 'text',
        markdown:
          '| | kopfgesteuert (`while`) | fußgesteuert (`do-while`) |\n|---|---|---|\n| umgangssprachlich | **solange** rechts ein Hindernis liegt, geh einen Schritt weiter | **führe aus:** geh einen Schritt weiter, **solange** rechts ein Hindernis liegt |\n| Java | `while(hindernisRechts())`<br>`{`<br>`    schritt();`<br>`}` | `do`<br>`{`<br>`    schritt();`<br>`}`<br>`while(hindernisRechts());` |\n| allgemein | `while(Laufbedingung) { Anweisungsblock }` | `do { Anweisungsblock } while(Laufbedingung);` |\n| Prüfung | **vor** jedem Durchlauf (im Kopf) | **nach** jedem Durchlauf (am Fuß) |\n| Durchläufe | eventuell **keiner** | **mindestens einer** |',
      },
      {
        art: 'merksatz',
        id: 'm-kopfgesteuert',
        titel: 'Kopfgesteuerte Schleife',
        text: 'Bei der kopfgesteuerten Schleife (while) wird die Laufbedingung vor jedem Durchlauf geprüft. Ist sie schon zu Beginn falsch, wird der Anweisungsblock kein einziges Mal ausgeführt.',
        quelle: V4,
      },
      {
        art: 'merksatz',
        id: 'm-fussgesteuert',
        titel: 'Fußgesteuerte Schleife',
        text: 'Bei der fußgesteuerten Schleife (do-while) wird die Laufbedingung erst nach dem Durchlauf geprüft. Der Anweisungsblock wird deshalb mindestens einmal ausgeführt. Hinter while(…) steht ein Semikolon.',
        quelle: V4,
      },
      {
        art: 'text',
        markdown:
          'Beide Schleifen laufen, **solange** die Laufbedingung wahr ist, und enden, sobald sie zum ersten Mal falsch ist. Das Ausrufezeichen kehrt einen Wahrheitswert um: `while(!fliegeAmPlatz())` läuft, solange **keine** Fliege am Platz liegt.\n\n**Wann welche?** Muss der Block auf jeden Fall einmal laufen, nimm `do-while`. Kann es sein, dass er gar nicht laufen darf (z.B. weil die Tarantel schon am Ziel steht), nimm `while`.',
      },
    ],
  },
  {
    id: 'l23-bedingt',
    kann: ['k23-if', 'k23-schleife-vs-bedingung'],
    titel: 'Bedingte Anweisungen',
    minuten: 3,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Bei einer **bedingten Anweisung** hängt die Ausführung eines Anweisungsblocks von einer Bedingung ab.\n\n| | einfache Fallunterscheidung (`if`) | doppelte Fallunterscheidung (`if-else`) |\n|---|---|---|\n| umgangssprachlich | **wenn** vorne keine Klatsche lauert, geh einen Schritt weiter | **wenn** vorne eine Klatsche lauert, umgehe sie, **sonst** geh einen Schritt weiter |\n| Java | `if(!klatscheVorn())`<br>`{`<br>`    schritt();`<br>`}` | `if(klatscheVorn())`<br>`{`<br>`    klatscheUmgehen();`<br>`}`<br>`else`<br>`{`<br>`    schritt();`<br>`}` |\n| allgemein | `if(Bedingung) { Anweisungsblock }` | `if(Bedingung) { Anweisungsblock 1 } else { Anweisungsblock 2 }` |\n| Ablauf | Block wird ausgeführt **oder übersprungen** | **genau einer** der beiden Blöcke wird ausgeführt |',
      },
      {
        art: 'merksatz',
        id: 'm-if',
        titel: 'Einfache Fallunterscheidung (if)',
        text: 'Ist die Bedingung wahr, wird der Anweisungsblock einmal ausgeführt. Ist sie falsch, wird er übersprungen und das Programm geht dahinter weiter.',
        quelle: V5,
      },
      {
        art: 'merksatz',
        id: 'm-if-else',
        titel: 'Doppelte Fallunterscheidung (if-else)',
        text: 'Ist die Bedingung wahr, wird Anweisungsblock 1 ausgeführt, sonst Anweisungsblock 2. Es wird immer genau einer der beiden Blöcke durchlaufen.',
        quelle: V5,
      },
      {
        art: 'merksatz',
        id: 'm-schleife-vs-bedingung',
        titel: 'Schleife oder bedingte Anweisung?',
        text: 'Eine bedingte Anweisung prüft ihre Bedingung genau einmal und führt den Anweisungsblock höchstens einmal aus. Eine Schleife springt nach jedem Durchlauf zurück, prüft die Bedingung erneut und wiederholt den Anweisungsblock, solange die Bedingung wahr ist.',
        quelle: 'aus den Videos zu Schleifen und bedingten Anweisungen abgeleitet',
        abgleichen: true,
      },
      {
        art: 'text',
        markdown:
          '**Probe:** Auf dem Platz liegen drei Fliegen. `if(fliegeAmPlatz()) { fliegeFressen(); }` frisst **eine** Fliege. `while(fliegeAmPlatz()) { fliegeFressen(); }` frisst **alle drei**.',
      },
    ],
  },
];
