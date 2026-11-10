import type { Lektion } from '../typen';

const V9 = 'Video „Komplexere Probleme mit strukturierter Programmierung beherrschen“, Skript S. 15–17';

export const LEKTIONEN_B27: Lektion[] = [
  {
    id: 'l27-phasen',
    kann: ['k27-benennen', 'k27-beschreiben', 'k27-anwenden'],
    titel: 'Die 5 Phasen der strukturierten Programmierung',
    minuten: 5,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Bei größeren Aufgaben verliert man schnell den Überblick, wenn man sofort losprogrammiert. Die strukturierte Programmierung gibt deshalb fünf Phasen vor, die der Reihe nach abgearbeitet werden. Leitbeispiel im Unterricht: Die Tarantel räumt Essensreste (Fliegen) von Tischen (Hindernisreihen) ab und geht danach schlafen.',
      },
      {
        art: 'merksatz',
        id: 'm-phasen',
        titel: 'Die 5 Phasen',
        text: '1. Präzise Beschreibung des Problems, seiner Varianten und Grenzfälle · 2. Schrittweises Zerlegen des Problems in Teilprobleme · 3. Schrittweises Entwickeln der Teillösungen und der Gesamtlösung · 4. Implementieren der Lösung · 5. Testen der Implementierung',
        quelle: V9,
      },
      {
        art: 'text',
        markdown:
          '**Phase 1 – Problem beschreiben.** Man klärt, ob man das Problem wirklich ganz verstanden hat. Dazu bestimmt man die **Invariante** (alles, was immer gleich bleibt) und die **Varianten** (alles, was sich ändern kann) und achtet besonders auf **Grenzfälle**.\n*Tische:* Invariante – ein Tisch ist eine waagerechte Hindernisreihe, die Fliegen liegen eine Reihe darüber, Start an der linken Wand mit Blick nach rechts. Varianten – Länge und Anzahl der Tische, Fliege ja/nein pro Feld, Abstände.\n\n**Phase 2 – Zerlegen (top-down).** Das Problem wird grob in Teilprobleme eingeteilt und diese wieder, bis nur noch sehr einfache Teilprobleme übrig sind. Das Ergebnis ist ein **Problembaum**:\n\n```\nAufräumen\n├─ Zum 1. Tisch\n├─ Tische abräumen\n│  ├─ Tisch abräumen\n│  │  ├─ Platz abräumen\n│  │  └─ Zum nächsten Platz\n│  └─ Zum nächsten Tisch\n└─ Schlafen gehen\n```\n\n**Phase 3 – Teillösungen entwickeln (bottom-up).** Man beginnt unten im Problembaum bei den einfachsten Teilproblemen und setzt die Teillösungen nach oben zur Gesamtlösung zusammen. Dargestellt werden sie in einer standardisierten Form, z.B. als **Struktogramm**.\n\n**Phase 4 – Implementieren.** Die Lösung wird in eine Programmiersprache umgesetzt. **Jede Teillösung wird eine eigene Methode**, z.B. `platzAbraeumen()`, `tischAbraeumen()`.\n\n**Phase 5 – Testen.** Das Programm wird mit verschiedenen Varianten ausprobiert, besonders mit **Spezialfällen** (z.B. „die Reihe enthält gar keinen Tisch“).',
      },
      {
        art: 'merksatz',
        id: 'm-invariante',
        titel: 'Invariante und Varianten',
        text: 'Die Invariante ist die Gesamtheit der unveränderlichen Merkmale eines Problems. Varianten sind die Merkmale, die sich ändern können. Die Lösung muss für alle Varianten funktionieren.',
        quelle: V9,
      },
      {
        art: 'merksatz',
        id: 'm-topdown',
        titel: 'Top-down und bottom-up',
        text: 'Zerlegt wird top-down: vom Gesamtproblem zu immer kleineren Teilproblemen (Problembaum). Entwickelt wird bottom-up: von den einfachsten Teillösungen hinauf zur Gesamtlösung.',
        quelle: V9,
      },
    ],
  },
  {
    id: 'l27-vorteile',
    kann: ['k27-argumente', 'k27-stellung'],
    titel: 'Warum so vorgehen – und wann nicht?',
    minuten: 3,
    abschnitte: [
      {
        art: 'text',
        markdown:
          'Das Gegenbeispiel: Die gesamte Lösung steht in **einer** großen Methode mit tief verschachtelten Schleifen. Nach ein paar Wochen versteht man sie selbst nicht mehr, Fehler sind schwer zu finden, und einzelne Teile lassen sich nicht woanders verwenden.',
      },
      {
        art: 'merksatz',
        id: 'm-vorteile',
        titel: 'Drei Vorteile der strukturierten Programmierung',
        text: '1. Wiederverwendbarkeit: Teillösungen wie tischAbraeumen() sind eigene Methoden und können einzeln und in anderen Programmen aufgerufen werden. · 2. Testbarkeit: Jede Methode lässt sich einzeln testen; tritt ein Fehler auf, weiß man, in welcher Methode er steckt. · 3. Verständlichkeit: Sprechende Methodennamen wie platzAbraeumen() erklären sich selbst; der Quelltext bleibt übersichtlich.',
        quelle: V9,
      },
      {
        art: 'merksatz',
        id: 'm-wann-sinnvoll',
        titel: 'Wann ist das Vorgehen sinnvoll?',
        text: 'Sinnvoll bei komplexen Problemen, die aus mehreren Teilproblemen bestehen und viele Varianten und Grenzfälle haben. Nicht nötig bei sehr einfachen Problemen, die sich mit wenigen Anweisungen direkt lösen lassen – dort wäre der Aufwand für Problembaum und Struktogramme größer als der Nutzen.',
        quelle: 'Video (Vorteile; Einschränkung dort nur für sehr einfache Teilprobleme genannt)',
        abgleichen: true,
      },
      {
        art: 'text',
        markdown:
          '**Für „Stellung nehmen“ in der Klausur:** Beziehe eine klare Position, begründe sie mit den Vorteilen, nenne auch die Grenze (Aufwand bei einfachen Problemen) und schließe mit einem Fazit. Weitere Argumente, die du nennen kannst: Arbeitsteilung im Team (jede Person übernimmt Teilprobleme) und leichtere Änderbarkeit (man ändert nur die betroffene Methode).',
      },
    ],
  },
];
