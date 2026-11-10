// Fester Katalog typischer Fehler. Jeder Fehlversuch wird – wo möglich – einem Muster zugeordnet,
// damit das Fehlerheft zeigt, was immer wieder schiefgeht, und nicht nur, welche Aufgabe.

export interface Fehlermuster {
  id: string;
  titel: string;
  erklaerung: string;
  /** Woran man den Fehler auf Papier selbst bemerkt. */
  gegenmittel: string;
}

export const FEHLERMUSTER: Fehlermuster[] = [
  // Schreibfehler – würde der Compiler finden, auf Papier bleiben sie unbemerkt.
  {
    id: 'syntax.semikolon',
    titel: 'Semikolon vergessen',
    erklaerung: 'Hinter jeder Anweisung (Aufruf, Zuweisung, return) steht ein Semikolon.',
    gegenmittel: 'Lies jede Zeile, die mit einer Anweisung endet, einzeln: Endet sie mit „;“?',
  },
  {
    id: 'syntax.semikolon-schleife',
    titel: 'Semikolon hinter while(…), if(…) oder for(…)',
    erklaerung: 'Ein Semikolon direkt hinter dem Kopf beendet die Kontrollstruktur sofort – der Block darunter gehört nicht mehr dazu.',
    gegenmittel: 'Hinter while(…), if(…) und for(…) folgt immer direkt „{“. Nur bei do … while(…); steht das Semikolon am Ende.',
  },
  {
    id: 'syntax.do-while-semikolon',
    titel: 'Semikolon nach do-while vergessen',
    erklaerung: 'Die fußgesteuerte Schleife endet mit while(Laufbedingung);',
    gegenmittel: 'do-while ist die einzige Kontrollstruktur, bei der hinter der runden Klammer ein Semikolon steht.',
  },
  {
    id: 'syntax.klammern',
    titel: 'Klammern fehlen oder passen nicht',
    erklaerung: 'Zu jeder öffnenden Klammer gehört eine schließende; Methodenaufrufe brauchen immer runde Klammern.',
    gegenmittel: 'Schreibe öffnende und schließende geschweifte Klammer sofort untereinander und fülle dann den Inhalt dazwischen.',
  },
  {
    id: 'syntax.schreibweise',
    titel: 'Groß-/Kleinschreibung oder Tippfehler',
    erklaerung: 'Java unterscheidet Groß- und Kleinschreibung: linksDrehen ist nicht linksdrehen, while ist nicht While.',
    gegenmittel: 'Schlüsselwörter werden immer kleingeschrieben; Methodennamen genau so, wie sie in der Schnittstelle stehen.',
  },
  {
    id: 'syntax.vergleich',
    titel: '= und == verwechselt',
    erklaerung: '= weist einen Wert zu, == vergleicht zwei Werte.',
    gegenmittel: 'In einer Bedingung steht nie ein einzelnes =.',
  },
  {
    id: 'syntax.zwilling',
    titel: 'fliegeAmPlatz und fliegenAmPlatz verwechselt',
    erklaerung: 'fliegeAmPlatz() liefert wahr/falsch, fliegenAmPlatz() eine Anzahl.',
    gegenmittel: 'Als Bedingung passt nur die Methode, die einen Wahrheitswert liefert.',
  },
  {
    id: 'syntax.sonstiges',
    titel: 'Sonstiger Schreibfehler',
    erklaerung: 'Der Quelltext enthält einen Fehler, den der Compiler melden würde.',
    gegenmittel: 'Lies deinen Quelltext am Ende einmal nur auf Schreibfehler hin durch – Zeile für Zeile.',
  },
  // Ablauf- und Denkfehler.
  {
    id: 'ablauf.endlos',
    titel: 'Endlosschleife',
    erklaerung: 'Im Schleifenrumpf ändert sich nichts, wovon die Laufbedingung abhängt – oder sie kann nie falsch werden.',
    gegenmittel: 'Frage bei jeder Schleife: Was im Rumpf sorgt dafür, dass die Laufbedingung irgendwann falsch wird?',
  },
  {
    id: 'ablauf.wand',
    titel: 'Gegen ein Hindernis gelaufen',
    erklaerung: 'Die Tarantel geht einen Schritt, obwohl vor ihr ein Hindernis liegt („Vor der Spinne liegt ein Hindernis.“).',
    gegenmittel: 'Prüfe vor jedem schritt(), ob der Weg frei sein kann – besonders beim ersten Durchlauf einer do-while-Schleife.',
  },
  {
    id: 'ablauf.klatsche',
    titel: 'In die Klatsche gelaufen',
    erklaerung: 'Die Tarantel ist auf eine Klatsche gelaufen und kann danach nichts mehr tun.',
    gegenmittel: 'Prüfe mit klatscheVorn(), bevor du einen Schritt gehst.',
  },
  {
    id: 'ablauf.keine-fliege',
    titel: 'Fressen ohne Fliege',
    erklaerung: 'fliegeFressen() wurde aufgerufen, obwohl auf dem Platz keine Fliege liegt.',
    gegenmittel: 'Fressen nur, wenn fliegeAmPlatz() wahr ist – oder wenn sicher ist, dass dort eine Fliege liegt.',
  },
  {
    id: 'ablauf.grenzfall',
    titel: 'Grenzfall nicht bedacht',
    erklaerung: 'Im Normalfall klappt es, aber nicht in einer besonderen Lage (z.B. Ziel schon am Start, letztes Feld, kein Hindernis).',
    gegenmittel: 'Spiele dein Programm auch für die extremen Fälle durch: Was passiert, wenn die Bedingung sofort falsch ist? Wird das letzte Feld noch bearbeitet?',
  },
  {
    id: 'ablauf.ziel-verfehlt',
    titel: 'Ziel nicht erreicht',
    erklaerung: 'Am Ende steht die Tarantel woanders, blickt in eine andere Richtung oder hat eine andere Zahl Fliegen als verlangt.',
    gegenmittel: 'Führe einen Schreibtischtest durch: Notiere nach jeder Anweisung Position, Blickrichtung und Fliegen.',
  },
  {
    id: 'kontrolle.kopf-fuss',
    titel: 'Kopf- und Fußsteuerung verwechselt',
    erklaerung: 'do-while führt den Rumpf mindestens einmal aus, while eventuell gar nicht.',
    gegenmittel: 'Frage: Darf der Rumpf auch keinmal laufen? Dann kopfgesteuert (while).',
  },
  {
    id: 'kontrolle.if-statt-while',
    titel: 'Bedingte Anweisung statt Schleife (oder umgekehrt)',
    erklaerung: 'if führt den Block höchstens einmal aus, while wiederholt ihn, solange die Bedingung wahr ist.',
    gegenmittel: '„wenn“ → if, „solange“ / „bis“ → Schleife.',
  },
  {
    id: 'logik.verneinung',
    titel: 'Verneinung falsch gesetzt',
    erklaerung: 'Das ! fehlt, steht zu viel oder bezieht sich auf den falschen Teil (z.B. !A && B statt !(A && B)).',
    gegenmittel: 'Lies die Bedingung laut: „solange NICHT …“ – und prüfe, worauf sich das NICHT bezieht.',
  },
  {
    id: 'logik.und-oder',
    titel: 'UND und ODER verwechselt',
    erklaerung: '&& ist nur wahr, wenn beide Seiten wahr sind; || schon, wenn eine Seite wahr ist.',
    gegenmittel: 'Stelle die Wertetabelle auf und vergleiche sie mit der Aufgabenstellung.',
  },
  {
    id: 'logik.praezedenz',
    titel: 'Präzedenz nicht beachtet',
    erklaerung: 'UND bindet stärker als ODER, NICHT stärker als beide.',
    gegenmittel: 'Werte in der Reihenfolge Klammer → NICHT → UND → ODER aus und schreibe jede Stufe in eine neue Zeile.',
  },
  {
    id: 'struktur.vorgabe',
    titel: 'Verlangte Kontrollstruktur fehlt',
    erklaerung: 'Die Aufgabe verlangt eine bestimmte Kontrollstruktur (z.B. fußgesteuerte Schleife oder Hilfsmethode).',
    gegenmittel: 'Unterstreiche in der Aufgabenstellung, welche Struktur verlangt ist, und hake sie am Ende ab.',
  },
  {
    id: 'darstellung.einrueckung',
    titel: 'Einrückung passt nicht zur Struktur',
    erklaerung: 'Was zwischen den geschweiften Klammern eines Konstrukts steht, gehört eine Stufe weiter nach rechts.',
    gegenmittel: 'Konstrukt und beide Klammern auf eine Höhe, Inhalt einen Tab eingerückt.',
  },
];

const NACH_ID = new Map(FEHLERMUSTER.map((m) => [m.id, m]));

export function fehlermuster(id: string): Fehlermuster | undefined {
  return NACH_ID.get(id);
}

/** Ordnet einen Diagnose-Code des Übersetzers einem Fehlermuster zu. */
export function musterZuDiagnose(code: string): string {
  if (code === 'semikolon-fehlt') return 'syntax.semikolon';
  if (code === 'semikolon-nach-while' || code === 'semikolon-nach-if' || code === 'semikolon-nach-for') return 'syntax.semikolon-schleife';
  if (code === 'semikolon-nach-do-while-fehlt') return 'syntax.do-while-semikolon';
  if (code.startsWith('klammer-') || code === 'bedingung-klammern' || code === 'methodenrumpf-fehlt' || code === 'rumpf-fehlt') return 'syntax.klammern';
  if (code === 'schluesselwort-gross' || code === 'schluesselwort-falsch' || code === 'methode-unbekannt' || code === 'variable-unbekannt') return 'syntax.schreibweise';
  if (code === 'zuweisung-statt-vergleich' || code === 'vergleich-statt-zuweisung') return 'syntax.vergleich';
  if (code === 'zwilling-verwechselt') return 'syntax.zwilling';
  if (code === 'einrueckung') return 'darstellung.einrueckung';
  return 'syntax.sonstiges';
}
