// Probeklausuren aus dem Aufgabenpool. Die Auswahl deckt alle Bereiche der Kann-Liste ab.

export interface Probeklausur {
  id: string;
  titel: string;
  minuten: number;
  beschreibung: string;
  /** Aufgaben in Klausurreihenfolge, gruppiert wie in einer echten Klausur. */
  teile: { titel: string; aufgaben: string[] }[];
}

export const PROBEKLAUSUREN: Probeklausur[] = [
  {
    id: 'mini',
    titel: 'Mini-Probeklausur',
    minuten: 30,
    beschreibung: 'Ein Querschnitt durch alle Themen in 30 Minuten – ideal als Generalprobe am letzten Tag.',
    teile: [
      { titel: 'Objektorientierung', aufgaben: ['b1-vererbung-erklaeren', 'b1-diagramm-vogel'] },
      { titel: 'Logische Funktionen', aufgaben: ['b24-auswertung-3', 'b24-genau-eine-seite'] },
      { titel: 'Kontrollstrukturen', aufgaben: ['v25-schleife-in-schleife', 'p25-einsammeln'] },
      { titel: 'Strukturierte Programmierung', aufgaben: ['b27-argumente'] },
    ],
  },
  {
    id: 'voll',
    titel: 'Probeklausur (90 Minuten)',
    minuten: 90,
    beschreibung: 'So lang wie eine echte Klausur, mit Aufgaben aus allen Anforderungsbereichen. Plane sie für einen Tag mit mehr Zeit.',
    teile: [
      { titel: 'Aufgabe 1 – Objektorientierung', aufgaben: ['b1-klasse-objekt-beschreiben', 'b1-diagramm-spinne', 'm1-zoo'] },
      { titel: 'Aufgabe 2 – Kontrollstrukturen', aufgaben: ['b22-unterschied-erklaeren', 'v25-umgehen', 'p24-tunnel', 'p25-umgehen'] },
      { titel: 'Aufgabe 3 – Logische Funktionen', aufgaben: ['b24-praezedenz-angeben', 'b24-auswertung-2', 'b24-bedingung-waehlen'] },
      { titel: 'Aufgabe 4 – Struktogramme', aufgaben: ['s26-beschreiben', 's26-zu-java-2'] },
      { titel: 'Aufgabe 5 – Strukturierte Programmierung', aufgaben: ['b27-phasen-beschreiben', 'b27-stellung'] },
    ],
  },
];

export function probeklausur(id: string): Probeklausur | undefined {
  return PROBEKLAUSUREN.find((k) => k.id === id);
}
