// Verbindet Schülercode, Welt und Interpreter für Oberfläche und Aufgabenprüfung.
import { type Diagnose, type Lauf, type ParseErgebnis, type Programm, type Schritt, type Wert, fuehreAus, parse } from '../engine/java';
import { type Welt, parseWelt } from '../engine/welt';
import type { WeltAngabe } from '../inhalte/typen';

export function baueWelt(angabe: WeltAngabe): Welt {
  return parseWelt(angabe.karte, { gefressen: angabe.gefressen, fliegenUnterSpinne: angabe.fliegenUnterSpinne });
}

/** Aufgaben zeigen oft nur Methoden ohne Klassenrahmen; beides wird akzeptiert. */
export function uebersetze(quelltext: string): ParseErgebnis {
  const mitKlasse = /\bclass\b/.test(quelltext.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));
  return parse(quelltext, { nurMethoden: !mitKlasse });
}

export function echteFehler(diagnosen: Diagnose[]): Diagnose[] {
  return diagnosen.filter((d) => (d.schwere === 'fehler' || d.schwere === 'nicht-unterstuetzt') && !d.folgefehler);
}

export interface Ausfuehrung {
  programm: Programm;
  start: Welt;
  lauf: Lauf;
}

/** Übersetzt und startet eine Methode. Wirft, wenn der Quelltext nicht ausführbar ist (nur für geprüfte Inhalte gedacht). */
export function starte(quelltext: string, methode: string, welt: WeltAngabe, args: Wert[] = [], aufzeichnen = true): Ausfuehrung {
  const { programm, diagnosen } = uebersetze(quelltext);
  if (!programm) throw new Error(`Quelltext nicht ausführbar: ${echteFehler(diagnosen)[0]?.text ?? 'unbekannter Fehler'}`);
  const start = baueWelt(welt);
  return { programm, start, lauf: fuehreAus(programm, methode, args, start, { aufzeichnen }) };
}

const RICHTUNG_NAME: Record<number, string> = { 0: 'rechts', 90: 'unten', 180: 'links', 270: 'oben' };

export function richtungsName(richtung: number): string {
  return RICHTUNG_NAME[richtung] ?? String(richtung);
}

function zeigeWert(wert: Wert): string {
  return typeof wert === 'boolean' ? (wert ? 'wahr' : 'falsch') : String(wert);
}

/** Text des Quelltextabschnitts, zu dem ein Knoten gehört. */
function knotenText(programm: Programm, id: number): string {
  const knoten = programm.knoten.get(id);
  return knoten ? programm.quelltext.slice(knoten.pos.von, knoten.pos.bis).replace(/\s+/g, ' ') : '';
}

/** Beschreibt einen aufgezeichneten Schritt in einem Satz. */
export function beschreibeSchritt(schritt: Schritt, programm: Programm): string {
  const e = schritt.ereignis;
  switch (e.art) {
    case 'anweisung':
      return knotenText(programm, e.knoten);
    case 'bedingung': {
      const teile = e.teile.length > 1 ? ` (${e.teile.map((t) => `${t.text} = ${zeigeWert(t.wert)}`).join(', ')})` : '';
      return `Bedingung ${knotenText(programm, e.knoten)} ist ${e.wert ? 'wahr' : 'falsch'}${teile}`;
    }
    case 'aktion':
      return `${e.name}()${e.ok ? '' : ' – ohne Wirkung'}${e.meldung ? `: „${e.meldung}“` : ''}`;
    case 'aufruf':
      return `Aufruf der Methode ${e.methode}(${e.args.map(zeigeWert).join(', ')})`;
    case 'rueckkehr':
      return `Zurück aus ${e.methode}()${e.wert !== undefined ? ` mit dem Wert ${zeigeWert(e.wert)}` : ''}`;
    case 'variable':
      return `${e.name} ${e.neu ? 'wird angelegt mit' : 'bekommt'} den Wert ${zeigeWert(e.wert)}`;
    case 'ende':
      return endeText(e);
  }
}

export function endeText(ende: Lauf['ende']): string {
  if (ende.grund === 'fertig') return 'Die Methode ist beendet.';
  if (ende.grund === 'endlosschleife') return `Endlosschleife: ${ende.text ?? 'Die Schleife endet nie.'}`;
  if (ende.grund === 'schrittlimit') return `Abgebrochen nach sehr vielen Schritten – vermutlich eine Endlosschleife. ${ende.text ?? ''}`.trim();
  if (ende.grund === 'stapelueberlauf') return `Abgebrochen: Eine Methode ruft sich immer wieder selbst auf. ${ende.text ?? ''}`.trim();
  return `Laufzeitfehler: ${ende.text ?? ''}`.trim();
}

export { zeigeWert as zeigeJavaWert };
