import type { Operator } from './typen';

// Definitionen und Anforderungsbereiche nach „Informatik – Übersicht über die Operatoren“ (abitur.nrw).
// „erwartet“ ist eine eigene Übersetzung in Alltagssprache.
export const OPERATOREN: Operator[] = [
  {
    name: 'angeben',
    definition: 'ohne nähere Erläuterungen und Begründungen aufzählen, nennen',
    afb: 'I',
    erwartet: 'Nur aufzählen. Stichpunkte reichen, keine Begründung nötig.',
  },
  {
    name: 'beschreiben',
    definition: 'Sachverhalte oder Zusammenhänge unter Verwendung der Fachsprache in eigenen Worten verständlich wiedergeben',
    afb: 'I',
    erwartet: 'In ganzen Sätzen sagen, was etwas ist oder wie es abläuft – mit den Fachbegriffen, in eigenen Worten. Keine Begründung nötig.',
  },
  {
    name: 'erläutern',
    definition: 'einen Sachverhalt auf der Grundlage von Vorkenntnissen so darlegen, dass er verständlich wird',
    afb: 'I–II',
    erwartet: 'Beschreiben und verständlich machen, am besten mit einem Beispiel.',
  },
  {
    name: 'erklären',
    definition: '(steht nicht in der NRW-Liste; die Kann-Liste verwendet es wie „erläutern“/„begründen“)',
    afb: 'I–II',
    erwartet: 'Sagen, was gilt UND warum bzw. wie es zusammenhängt. Ein Beispiel hilft.',
  },
  {
    name: 'begründen',
    definition: 'einen Sachverhalt oder eine Entwurfsentscheidung durch Angabe von Gründen erklären',
    afb: 'II–III',
    erwartet: 'Gründe nennen und jeden Grund kurz ausführen („…, weil …“).',
  },
  {
    name: 'vergleichen',
    definition: 'nach vorgegebenen oder selbst gewählten Kriterien Gemeinsamkeiten, Ähnlichkeiten und Unterschiede ermitteln und darstellen',
    afb: 'II',
    erwartet: 'Gemeinsamkeiten UND Unterschiede nennen, nach Kriterien geordnet.',
  },
  {
    name: 'analysieren',
    definition:
      'eine konkrete Materialgrundlage untersuchen, einzelne Elemente identifizieren und Beziehungen zwischen den Elementen erfassen; wird immer mit einem weiteren Operator kombiniert',
    afb: 'II–III',
    erwartet: 'Das Material (Code, Struktogramm, Diagramm) genau untersuchen; das Ergebnis so darstellen, wie es der zweite Operator verlangt.',
  },
  {
    name: 'interpretieren',
    definition: 'Sinnzusammenhänge aus Materialien erschließen',
    afb: 'II–III',
    erwartet: 'Herausfinden und sagen, was das Programm oder Diagramm insgesamt bewirkt.',
  },
  {
    name: 'ermitteln',
    definition: 'mittels charakteristischer Merkmale einen Sachverhalt genau feststellen und beschreiben',
    afb: 'II',
    erwartet: 'Das Ergebnis herausfinden und angeben; der Weg sollte erkennbar sein.',
  },
  {
    name: 'anwenden',
    definition: 'ein bekanntes Verfahren in einer neuen Situation verwenden',
    afb: 'II',
    erwartet: 'Ein gelerntes Verfahren Schritt für Schritt auf das neue Beispiel übertragen.',
  },
  {
    name: 'überführen',
    definition: 'eine Darstellung in eine andere Darstellungsform bringen',
    afb: 'I–II',
    erwartet: 'Dasselbe in anderer Form aufschreiben, z.B. Struktogramm → Java. Die Logik bleibt gleich.',
  },
  {
    name: 'modellieren',
    definition: 'zu einem Ausschnitt der Realität ein informatisches Modell anfertigen',
    afb: 'II–III',
    erwartet: 'Ein Modell entwerfen, z.B. ein Klassendiagramm oder ein Struktogramm.',
  },
  {
    name: 'implementieren',
    definition: 'umsetzen eines informatischen Modells oder Algorithmus’ in eine Programmiersprache',
    afb: 'II–III',
    erwartet: 'Lauffähigen Java-Quelltext schreiben: korrekte Syntax, Klammern, Semikolons, Einrückung.',
  },
  {
    name: 'modifizieren',
    definition: 'eine gegebene Struktur gemäß konkreter Vorgaben verändern',
    afb: 'II',
    erwartet: 'Das Gegebene gezielt ändern, sodass es die Vorgabe erfüllt – alles andere bleibt, wie es ist.',
  },
  {
    name: 'vervollständigen',
    definition: 'eine gegebene Struktur gemäß konkreter Vorgaben erweitern oder verändern',
    afb: 'II',
    erwartet: 'Die Lücken im Gegebenen so füllen, dass es die Vorgabe erfüllt.',
  },
  {
    name: 'erweitern',
    definition: 'eine gegebene Struktur gemäß konkreter Vorgaben ergänzen',
    afb: 'II',
    erwartet: 'Das Gegebene beibehalten und um das Geforderte ergänzen.',
  },
  {
    name: 'beurteilen',
    definition: 'zu einem Sachverhalt ein selbstständiges Urteil unter Verwendung von Fachwissen und Fachmethoden formulieren und begründen',
    afb: 'III',
    erwartet: 'Ein eigenes Urteil fällen und es fachlich begründen.',
  },
  {
    name: 'Stellung nehmen',
    definition: 'unter Heranziehung relevanter Sachverhalte die eigene Meinung zu einem Problem argumentativ entwickeln und darlegen',
    afb: 'III',
    erwartet: 'Eigene Position beziehen, Argumente dafür und dagegen abwägen, zu einem klaren Schluss kommen.',
  },
];

export function operator(name: string | undefined): Operator | undefined {
  return name ? OPERATOREN.find((o) => o.name === name) : undefined;
}
