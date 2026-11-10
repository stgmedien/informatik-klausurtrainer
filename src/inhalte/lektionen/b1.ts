import { SPINNENWELT } from '../modelle';
import type { Lektion } from '../typen';

const V1 = 'Video „Was ist objektorientierte Programmierung?“, Skript S. 3–5';
const V2 = 'Video „Vererbung in Java“, Skript S. 6';

export const LEKTIONEN_B1: Lektion[] = [
  {
    id: 'l1-begriffe',
    kann: ['k1-begriffe'],
    titel: 'Klasse, Objekt, Attribut, Attributwert, Methode',
    minuten: 4,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'In der objektorientierten Programmierung betrachtet man die Welt in **Objekten**. In der Spinnenwelt ist jede einzelne Spinne ein Objekt, ebenso jede Fliege, jede Klatsche und jedes Hindernis – sogar jedes einzelne Hindernis am Rand.\n\nInspizierst du in Greenfoot zwei Spinnen (Rechtsklick → Inspizieren), siehst du zwei **Objektdiagramme**:',
      },
      {
        art: 'material',
        material: {
          art: 'objekte',
          objekte: [
            {
              name: 'spinne1',
              klasse: 'Spinne',
              attribute: [
                ['x', '9'],
                ['y', '3'],
                ['rotation', '0'],
                ['fliegen', '0'],
                ['geklatscht', 'false'],
              ],
            },
            {
              name: 'spinne2',
              klasse: 'Spinne',
              attribute: [
                ['x', '4'],
                ['y', '7'],
                ['rotation', '90'],
                ['fliegen', '2'],
                ['geklatscht', 'false'],
              ],
            },
          ],
        },
      },
      {
        art: 'text',
        markdown:
          'So liest du ein Objektdiagramm: Oben steht der **Name des Objekts**, hinter dem Doppelpunkt seine **Klasse**. Links stehen die **Attribute**, rechts die **Attributwerte**.\n\nBeide Spinnen haben dieselben Attribute (x, y, rotation, fliegen, geklatscht) – aber unterschiedliche Attributwerte. Beide können dasselbe tun, zum Beispiel `schritt()` oder `linksDrehen()`: Das sind ihre **Methoden**.',
      },
      {
        art: 'merksatz',
        id: 'm-objekt',
        titel: 'Objekt',
        text: 'Ein Objekt ist ein konkretes Ding der betrachteten Welt, z.B. die Spinne spinne1. Jedes Objekt hat Eigenschaften (Attribute) und Fähigkeiten (Methoden).',
        quelle: V1,
      },
      {
        art: 'merksatz',
        id: 'm-klasse',
        titel: 'Klasse',
        text: 'Eine Klasse ist der Bauplan für Objekte. In ihr werden die Attribute und Methoden einmal festgelegt. Aus einer Klasse lassen sich beliebig viele Objekte erzeugen.',
        quelle: V1,
      },
      {
        art: 'merksatz',
        id: 'm-attribut',
        titel: 'Attribut',
        text: 'Ein Attribut ist eine Eigenschaft, die alle Objekte einer Klasse besitzen, z.B. die x-Koordinate einer Spinne.',
        quelle: V1,
      },
      {
        art: 'merksatz',
        id: 'm-attributwert',
        titel: 'Attributwert',
        text: 'Der Attributwert ist der konkrete Wert eines Attributs bei einem bestimmten Objekt, z.B. x = 9. Objekte derselben Klasse haben dieselben Attribute, unterscheiden sich aber in ihren Attributwerten.',
        quelle: V1,
      },
      {
        art: 'merksatz',
        id: 'm-methode',
        titel: 'Methode',
        text: 'Eine Methode ist eine Fähigkeit eines Objekts – etwas, das es tun kann, z.B. schritt() oder linksDrehen().',
        quelle: V1,
      },
      {
        art: 'text',
        markdown:
          '**Alltagsbeispiel aus dem Skript:** Klasse `Auto` · Objekt „mein Auto“ · Attribut `farbe` · Attributwert „taubenblau metallic“ · Methode `hupen`.\n\n**Typische Verwechslung:** Attribut und Attributwert. „Farbe“ ist das Attribut, „taubenblau“ der Attributwert. Ebenso Klasse und Objekt: `Spinne` ist der Bauplan, `spinne1` ein konkretes Exemplar.',
      },
    ],
  },
  {
    id: 'l1-vererbung',
    kann: ['k1-vererbung'],
    titel: 'Vererbung: Ober- und Unterklassen',
    minuten: 4,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Legst du in Greenfoot die Klasse `Tarantel` als Unterklasse von `Spinne` an, ist sie zunächst leer:\n\n```java\npublic class Tarantel extends Spinne\n{\n}\n```\n\nTrotzdem kann eine Tarantel sofort laufen, drehen und fressen. Der Grund: Sie **erbt** alles von `Spinne` – und über `Spinne` auch alles von `Actor`.',
      },
      { art: 'material', material: { art: 'klassendiagramm', modell: SPINNENWELT, titel: 'Klassendiagramm der Spinnenwelt (Ausschnitt)' } },
      {
        art: 'merksatz',
        id: 'm-vererbung',
        titel: 'Vererbung',
        text: 'Bei der Vererbung übernimmt (erbt) eine Unterklasse alle Attribute und Methoden ihrer Oberklasse – auch über mehrere Stufen hinweg. In Java erbt eine Klasse von höchstens einer anderen Klasse; das Schlüsselwort dafür ist extends.',
        quelle: V2,
      },
      {
        art: 'merksatz',
        id: 'm-ober-unter',
        titel: 'Oberklasse und Unterklasse',
        text: 'Die Klasse, die erbt, heißt Unterklasse. Die Klasse, von der geerbt wird, heißt Oberklasse. Beispiel: Tarantel ist Unterklasse von Spinne, Spinne ist Oberklasse von Tarantel.',
        quelle: V2,
      },
      {
        art: 'merksatz',
        id: 'm-spezialisierung',
        titel: 'Spezialisierung',
        text: 'Die Unterklasse ist eine Spezialisierung der Oberklasse: Sie besitzt alles Geerbte und kann zusätzliche Attribute und Methoden haben. Jede Tarantel ist eine Spinne, aber nicht jede Spinne ist eine Tarantel.',
        quelle: V2,
      },
      {
        art: 'merksatz',
        id: 'm-generalisierung',
        titel: 'Generalisierung (Verallgemeinerung)',
        text: 'Die Oberklasse ist eine Generalisierung (Verallgemeinerung) ihrer Unterklassen: Sie fasst zusammen, was allen Unterklassen gemeinsam ist.',
        quelle: `${V2} (dort: „Verallgemeinerung“)`,
      },
      {
        art: 'merksatz',
        id: 'm-vererbung-nutzen',
        titel: 'Wozu Vererbung?',
        text: 'Gemeinsame Attribute und Methoden werden nur einmal in der Oberklasse programmiert. Das spart Schreibarbeit und hält den Quelltext schlank.',
        quelle: V2,
      },
      {
        art: 'merksatz',
        id: 'm-ist-ein',
        titel: 'Ist-ein-Test',
        text: 'Vererbung ist sinnvoll, wenn der Satz „Ein(e) Unterklasse ist ein(e) Oberklasse“ stimmt: Ein Hund ist ein Tier (passt). Ein Rad ist ein Auto (passt nicht – ein Auto hat Räder).',
        quelle: 'fachlich übliche Faustregel',
        abgleichen: true,
      },
      {
        art: 'text',
        markdown:
          'Im Klassendiagramm zeigt der Pfeil mit der leeren Dreiecksspitze **von der Unterklasse zur Oberklasse** (gelesen: „Tarantel ist eine Spinne“). Greenfoot zeichnet seinen Klassenbaum genauso.',
      },
    ],
  },
  {
    id: 'l1-diagramm-lesen',
    kann: ['k1-diagramm-lesen'],
    titel: 'Klassendiagramme lesen',
    minuten: 3,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Eine Klasse wird als Kasten mit drei Fächern gezeichnet: oben der **Name**, in der Mitte die **Attribute**, unten die **Methoden**. Ein `-` vor einem Eintrag bedeutet `private`, ein `+` bedeutet `public`.\n\nKlausurfrage: *Welche Attribute und Methoden besitzt ein Objekt der Klasse X?* So gehst du vor:\n\n1. Suche die Klasse X im Diagramm.\n2. Notiere ihre eigenen Attribute und Methoden.\n3. Folge dem Pfeil nach oben zur Oberklasse und sammle auch deren Attribute und Methoden ein.\n4. Wiederhole Schritt 3, bis keine Oberklasse mehr kommt.',
      },
      { art: 'material', material: { art: 'klassendiagramm', modell: SPINNENWELT } },
      {
        art: 'text',
        markdown:
          '**Beispiel:** Ein Objekt der Klasse `Tarantel` besitzt die Methoden `wenden`, `fliegeSuchen` (eigene), `schritt`, `linksDrehen`, `fliegeFressen`, `hindernisVorn` (von Spinne) sowie `act`, `getX`, `setRotation` (von Actor). Seine Attribute sind `fliegen`, `geklatscht` (von Spinne) und `x`, `y`, `rotation` (von Actor).',
      },
      {
        art: 'merksatz',
        id: 'm-vererbung-richtung',
        titel: 'Vererbt wird nur nach unten',
        text: 'Ein Objekt besitzt die Attribute und Methoden seiner eigenen Klasse und aller Oberklassen darüber. Es besitzt nichts aus Unterklassen und nichts aus Geschwisterklassen.',
        quelle: V2,
      },
    ],
  },
];
