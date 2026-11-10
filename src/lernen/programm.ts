// Prüft selbst geschriebenen Quelltext: Schreibfehler (wie ein Compiler), Verhalten in mehreren
// Testwelten (verglichen mit der Musterlösung), verlangte Kontrollstrukturen und Einrückung.
import {
  type Anweisung,
  type Ausdruck,
  type Diagnose,
  type Lauf,
  type Programm,
  type Wert,
  fuehreAus,
  pruefeEinrueckung,
  wendeReparaturenAn,
} from '../engine/java';
import { type Endzustand, MELDUNG_HINDERNIS, MELDUNG_KEINE_FLIEGE, type Welt, endzustand } from '../engine/welt';
import { musterZuDiagnose } from '../inhalte/fehlermuster';
import type { Aufgabe, StrukturMerkmal, Testfall } from '../inhalte/typen';
import { baueWelt, echteFehler, richtungsName, uebersetze } from './ausfuehren';

type Programmieraufgabe = Extract<Aufgabe, { typ: 'programmieren' }>;

export interface TestErgebnis {
  test: Testfall;
  bestanden: boolean;
  /** Warum der Test nicht bestanden ist, in einem Satz. */
  grund?: string;
  start: Welt;
  soll: Endzustand;
  sollLauf: Lauf;
  ist?: Endzustand;
  istLauf?: Lauf;
  muster?: string;
}

export interface ProgrammBewertung {
  /** Alle Meldungen des Übersetzers zum abgegebenen Text. */
  diagnosen: Diagnose[];
  /** Schreibfehler, die auf Papier unbemerkt bleiben würden. */
  schreibfehler: Diagnose[];
  einrueckung: Diagnose[];
  /** Programm, mit dem getestet wurde (ggf. nach automatischer Reparatur der Schreibfehler). */
  programm: Programm | null;
  repariert: boolean;
  tests: TestErgebnis[];
  strukturFehlt: StrukturMerkmal[];
  strukturVerboten: StrukturMerkmal[];
  /** Erkannte Fehlermuster (Katalog-IDs), wichtigstes zuerst. */
  muster: string[];
  /** Passt das Verhalten zu einer vorbereiteten Fehlvariante, steht hier deren Erklärung. */
  fehlvariante?: string;
  punkte: number;
  max: number;
  abzuege: { grund: string; punkte: number }[];
}

export const STRUKTUR_NAMEN: Record<StrukturMerkmal, string> = {
  while: 'kopfgesteuerte Schleife (while)',
  'do-while': 'fußgesteuerte Schleife (do-while)',
  for: 'Zählschleife (for)',
  if: 'bedingte Anweisung (if)',
  'if-else': 'doppelte Fallunterscheidung (if-else)',
  hilfsmethode: 'selbst geschriebene Hilfsmethode',
  und: 'UND-Verknüpfung (&&)',
  oder: 'ODER-Verknüpfung (||)',
  nicht: 'Verneinung (!)',
};

/** Welche Kontrollstrukturen und Operatoren im Programm vorkommen. */
export function strukturMerkmale(programm: Programm, startMethode: string): Set<StrukturMerkmal> {
  const gefunden = new Set<StrukturMerkmal>();
  const ausdruck = (a: Ausdruck | undefined): void => {
    if (!a) return;
    if (a.art === 'Binaer') {
      if (a.op === '&&') gefunden.add('und');
      if (a.op === '||') gefunden.add('oder');
      ausdruck(a.links);
      ausdruck(a.rechts);
    } else if (a.art === 'Unaer') {
      if (a.op === '!') gefunden.add('nicht');
      ausdruck(a.operand);
    } else if (a.art === 'Klammer') ausdruck(a.inhalt);
    else if (a.art === 'Aufruf') a.argumente.forEach(ausdruck);
  };
  const anweisung = (a: Anweisung | undefined): void => {
    if (!a) return;
    switch (a.art) {
      case 'Block':
        a.anweisungen.forEach(anweisung);
        break;
      case 'Wenn':
        gefunden.add(a.sonst ? 'if-else' : 'if');
        ausdruck(a.bedingung);
        anweisung(a.dann);
        anweisung(a.sonst);
        break;
      case 'Solange':
        gefunden.add('while');
        ausdruck(a.bedingung);
        anweisung(a.rumpf);
        break;
      case 'Wiederhole':
        gefunden.add('do-while');
        ausdruck(a.bedingung);
        anweisung(a.rumpf);
        break;
      case 'Zaehl':
        gefunden.add('for');
        ausdruck(a.bedingung);
        anweisung(a.rumpf);
        break;
      case 'VarDekl':
      case 'Zuweisung':
      case 'Rueckgabe':
        ausdruck(a.wert);
        break;
      case 'AufrufAnw':
        ausdruck(a.aufruf);
        break;
    }
  };
  for (const m of programm.klasse.methoden) {
    anweisung(m.rumpf);
    if (m.name !== startMethode && m.name !== 'act') {
      // Eine Hilfsmethode zählt, wenn sie irgendwo aufgerufen wird.
      const aufgerufen = programm.quelltext.match(new RegExp(`\\b${m.name}\\s*\\(`, 'g'))?.length ?? 0;
      if (aufgerufen > 1) gefunden.add('hilfsmethode');
    }
  }
  return gefunden;
}

function gleich(a: Endzustand, b: Endzustand): boolean {
  return a.x === b.x && a.y === b.y && a.richtung === b.richtung && a.gefressen === b.gefressen && a.lebt === b.lebt && a.fliegen === b.fliegen;
}

/** Beschreibt den Unterschied zweier Endzustände – nur das Wichtigste. */
function unterschied(soll: Endzustand, ist: Endzustand): string {
  const teile: string[] = [];
  if (!ist.lebt && soll.lebt) return 'Die Tarantel wurde geklatscht.';
  if (ist.x !== soll.x || ist.y !== soll.y) teile.push(`steht auf (${ist.x}|${ist.y}) statt auf (${soll.x}|${soll.y})`);
  if (ist.richtung !== soll.richtung) teile.push(`blickt nach ${richtungsName(ist.richtung)} statt nach ${richtungsName(soll.richtung)}`);
  if (ist.gefressen !== soll.gefressen) teile.push(`hat ${ist.gefressen} statt ${soll.gefressen} Fliege${soll.gefressen === 1 ? '' : 'n'} gefressen`);
  if (ist.fliegen !== soll.fliegen && ist.gefressen === soll.gefressen) teile.push('in der Welt liegen andere Fliegen als verlangt');
  return teile.length ? `Die Tarantel ${teile.join(', ')}.` : 'Der Endzustand weicht ab.';
}

function args(test: Testfall): Wert[] {
  return test.args ?? [];
}

export function fuehreTestAus(programm: Programm, methode: string, test: Testfall, aufzeichnen = false): Lauf {
  return fuehreAus(programm, methode, args(test), baueWelt(test.welt), { aufzeichnen });
}

/** Läuft die Musterlösung in einer Welt (für Inhaltstests und die Anzeige „so soll es sein“). */
export function sollLauf(a: Programmieraufgabe, test: Testfall, aufzeichnen = false): { programm: Programm; lauf: Lauf } {
  const { programm } = uebersetze(a.musterloesung);
  if (!programm) throw new Error(`Musterlösung von ${a.id} ist nicht ausführbar.`);
  return { programm, lauf: fuehreTestAus(programm, a.methode, test, aufzeichnen) };
}

function vergleiche(soll: Lauf, ist: Lauf): { bestanden: boolean; grund?: string; muster?: string } {
  if (ist.ende.grund === 'endlosschleife' || ist.ende.grund === 'schrittlimit') {
    return { bestanden: false, grund: 'Das Programm endet nicht (Endlosschleife).', muster: 'ablauf.endlos' };
  }
  if (ist.ende.grund !== 'fertig') return { bestanden: false, grund: ist.ende.text ?? 'Das Programm bricht mit einem Fehler ab.', muster: 'ablauf.ziel-verfehlt' };
  const sollEnde = endzustand(soll.endwelt);
  const istEnde = endzustand(ist.endwelt);
  if (!istEnde.lebt && sollEnde.lebt) return { bestanden: false, grund: 'Die Tarantel ist in eine Klatsche gelaufen.', muster: 'ablauf.klatsche' };
  if (soll.rueckgabe !== undefined && ist.rueckgabe !== soll.rueckgabe) {
    return { bestanden: false, grund: `Die Methode liefert ${String(ist.rueckgabe)} statt ${String(soll.rueckgabe)}.`, muster: 'ablauf.ziel-verfehlt' };
  }
  if (!gleich(sollEnde, istEnde)) return { bestanden: false, grund: unterschied(sollEnde, istEnde), muster: 'ablauf.ziel-verfehlt' };
  // Gleiches Ende, aber unterwegs gegen eine Wand gelaufen oder ins Leere gefressen: Das wäre in der Klausur ein Fehler.
  if (soll.konsole.length === 0 && ist.konsole.length > 0) {
    const meldung = ist.konsole[0];
    const muster = meldung === MELDUNG_HINDERNIS ? 'ablauf.wand' : meldung === MELDUNG_KEINE_FLIEGE ? 'ablauf.keine-fliege' : 'ablauf.ziel-verfehlt';
    return { bestanden: false, grund: `Das Ziel stimmt, aber unterwegs erscheint die Meldung „${meldung}“.`, muster };
  }
  return { bestanden: true };
}

const ABZUG_SCHREIBFEHLER = 0.5;

export function bewerteProgramm(a: Programmieraufgabe, quelltext: string): ProgrammBewertung {
  const max = a.punkte;
  const uebersetzt = uebersetze(quelltext);
  const schreibfehler = echteFehler(uebersetzt.diagnosen);
  let programm = uebersetzt.programm;
  let repariert = false;
  if (!programm && schreibfehler.every((d) => d.schwere === 'fehler')) {
    const neu = wendeReparaturenAn(quelltext, uebersetzt.diagnosen);
    if (neu !== null) {
      const zweiter = uebersetze(neu);
      if (zweiter.programm) {
        programm = zweiter.programm;
        repariert = true;
      }
    }
  }
  const einrueckung = programm ? pruefeEinrueckung(quelltext) : [];

  const tests: TestErgebnis[] = a.tests.map((test) => {
    const soll = sollLauf(a, test);
    const start = baueWelt(test.welt);
    const basis = { test, start, soll: endzustand(soll.lauf.endwelt), sollLauf: soll.lauf };
    if (!programm) return { ...basis, bestanden: false, grund: 'Der Quelltext lässt sich nicht ausführen.' };
    if (!programm.klasse.methoden.some((m) => m.name === a.methode)) {
      return { ...basis, bestanden: false, grund: `Es gibt keine Methode ${a.methode}().` };
    }
    const istLauf = fuehreTestAus(programm, a.methode, test);
    return { ...basis, ...vergleiche(soll.lauf, istLauf), ist: endzustand(istLauf.endwelt), istLauf };
  });

  const merkmale = programm ? strukturMerkmale(programm, a.methode) : new Set<StrukturMerkmal>();
  const strukturFehlt = programm ? (a.struktur?.muss ?? []).filter((m) => !merkmale.has(m)) : [];
  const strukturVerboten = programm ? (a.struktur?.verboten ?? []).filter((m) => merkmale.has(m)) : [];

  // Verhält sich das Programm in allen Welten wie eine vorbereitete Fehlvariante, kennen wir den Fehler genau.
  let fehlvariante: { muster: string; erklaerung: string } | undefined;
  if (programm && tests.some((t) => !t.bestanden)) {
    fehlvariante = a.fehlvarianten?.find((v) => {
      const p = uebersetze(v.quelltext).programm;
      if (!p) return false;
      return a.tests.every((test, i) => {
        const ist = tests[i].istLauf;
        if (!ist) return false;
        const variante = fuehreTestAus(p, a.methode, test);
        return variante.ende.grund === ist.ende.grund && gleich(endzustand(variante.endwelt), endzustand(ist.endwelt));
      });
    });
  }

  const muster: string[] = [];
  const merke = (id: string | undefined) => id && !muster.includes(id) && muster.push(id);
  if (fehlvariante) merke(fehlvariante.muster);
  // Besteht das Programm die Normalfälle, aber keinen Grenzfall, ist genau das der Fehler.
  const grenzfallFehler = tests.some((t) => !t.bestanden && t.test.grenzfall) && tests.some((t) => t.bestanden && !t.test.grenzfall);
  if (grenzfallFehler) merke('ablauf.grenzfall');
  tests.forEach((t) => merke(t.muster));
  if (strukturFehlt.length || strukturVerboten.length) merke('struktur.vorgabe');
  schreibfehler.forEach((d) => merke(musterZuDiagnose(d.code)));
  uebersetzt.diagnosen.filter((d) => d.schwere === 'warnung').forEach((d) => merke(musterZuDiagnose(d.code)));
  if (einrueckung.length) merke('darstellung.einrueckung');

  const abzuege: { grund: string; punkte: number }[] = [];
  const bestanden = tests.filter((t) => t.bestanden).length;
  let punkte = programm ? (bestanden / tests.length) * max : 0;
  if (!programm) abzuege.push({ grund: 'Der Quelltext ist so fehlerhaft, dass er nicht ausgeführt werden kann', punkte: max });
  else if (bestanden < tests.length) abzuege.push({ grund: `${tests.length - bestanden} von ${tests.length} Testwelten nicht bestanden`, punkte: max - punkte });
  if (programm && (strukturFehlt.length || strukturVerboten.length)) {
    const abzug = Math.min(punkte, Math.max(1, max / 4));
    punkte -= abzug;
    abzuege.push({ grund: 'Die verlangte Kontrollstruktur fehlt oder eine ausgeschlossene wurde benutzt', punkte: abzug });
  }
  if (programm && schreibfehler.length) {
    const abzug = Math.min(punkte, max / 3, schreibfehler.length * ABZUG_SCHREIBFEHLER);
    punkte -= abzug;
    abzuege.push({ grund: `${schreibfehler.length} Schreibfehler`, punkte: abzug });
  }
  if (programm && einrueckung.length) {
    const abzug = Math.min(punkte, 0.5);
    punkte -= abzug;
    abzuege.push({ grund: 'Einrückung passt nicht zur Struktur', punkte: abzug });
  }

  return {
    diagnosen: uebersetzt.diagnosen,
    schreibfehler,
    einrueckung,
    programm,
    repariert,
    tests,
    strukturFehlt,
    strukturVerboten,
    muster,
    fehlvariante: fehlvariante?.erklaerung,
    punkte: Math.max(0, Math.round(punkte * 2) / 2),
    max,
    abzuege: abzuege.filter((x) => x.punkte > 0),
  };
}
