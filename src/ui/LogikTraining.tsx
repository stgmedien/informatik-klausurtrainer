import { useMemo, useState } from 'react';
import { type Stufe, alleOperatoren, erzeugeAusdruck, erzeugeUebung, parseLogik, variablen } from '../engine/logik';
import type { Aufgabe } from '../inhalte/typen';
import { AufgabeAnsicht } from './aufgaben/AufgabeAnsicht';

interface Props {
  modus: 'auswertung' | 'tabelle';
  stufe: Stufe;
  /** Ohne Angabe: endlos weiterüben. */
  anzahl?: number;
  onFertig?: () => void;
}

/** Erzeugt immer neue Logik-Aufgaben; die Lösungen werden berechnet. */
export function LogikTraining({ modus, stufe, anzahl, onFertig }: Props) {
  const [start] = useState(() => Math.floor(Date.now() / 1000) % 1_000_000);
  const [nummer, setNummer] = useState(0);

  const aufgabe = useMemo<Aufgabe>(() => {
    const startwert = start + nummer * 17;
    const zaehler = anzahl ? ` (${nummer + 1} von ${anzahl})` : ` Nr. ${nummer + 1}`;
    if (modus === 'auswertung') {
      const uebung = erzeugeUebung(startwert, stufe);
      const belegung = variablen(parseLogik(uebung.ausdruck))
        .map((v) => `${v} = ${uebung.belegung[v]}`)
        .join(', ');
      return {
        id: `gen-auswertung-${stufe}-${startwert}`,
        typ: 'auswertung',
        kann: ['k24-praezedenz-anwenden'],
        titel: `Ausdruck auswerten${zaehler}`,
        minuten: 2,
        punkte: alleOperatoren(parseLogik(uebung.ausdruck)).length,
        operator: 'ermitteln',
        stellung: `Ermittle den Ergebniswahrheitswert für ${belegung}. Klicke jeweils den Operator an, der als Nächstes dran ist.`,
        ausdruck: uebung.ausdruck,
        belegung: uebung.belegung,
        notation: 'java',
        hinweise: [
          'Prüfe zuerst, ob es Klammern gibt.',
          'Rangfolge: 0. Klammerung, 1. Negation, 2. Konjunktion (UND), 3. Disjunktion (ODER).',
          'Erledige alle Negationen, dann alle UND von links nach rechts, zuletzt die ODER.',
        ],
      };
    }
    const ausdruck = erzeugeAusdruck(startwert, stufe);
    return {
      id: `gen-tabelle-${stufe}-${startwert}`,
      typ: 'wahrheitstabelle',
      kann: ['k24-praezedenz-anwenden'],
      titel: `Wahrheitstabelle ermitteln${zaehler}`,
      minuten: 3,
      punkte: 2 ** variablen(parseLogik(ausdruck)).length / 2,
      operator: 'ermitteln',
      stellung: 'Ermittle die Wahrheitstabelle des Ausdrucks. Werte dazu jede Zeile nach den Präzedenzregeln aus.',
      ausdruck,
      notation: 'java',
      ausdruckZeigen: true,
      hinweise: [
        'Bearbeite die Tabelle spaltenweise: Rechne zuerst Teilausdrücke aus (auf einem Zettel als Zwischenspalten).',
        'Zwischenspalten in der Reihenfolge Klammer → Negation → UND → ODER.',
        'Suche Abkürzungen: Ist bei einem ODER eine Seite wahr, ist das Ergebnis wahr.',
      ],
    };
  }, [modus, stufe, start, nummer, anzahl]);

  const letzte = anzahl !== undefined && nummer + 1 >= anzahl;

  return (
    <AufgabeAnsicht
      key={aufgabe.id}
      aufgabe={aufgabe}
      weiterText={letzte ? 'Weiter' : 'Nächste Aufgabe'}
      onWeiter={() => (letzte ? onFertig?.() : setNummer(nummer + 1))}
    />
  );
}
