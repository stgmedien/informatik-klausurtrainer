// Stilprüfung: Passt die Einrückung zur Klammertiefe?
// Verglichen wird relativ (Zeilen desselben Blocks gleich weit, tiefer als der umgebende Block),
// deshalb werden Allman- und K&R-Stil und jede einheitliche Schrittweite akzeptiert.

import type { Diagnose } from './ast';
import { lex, type Token } from './lexer';

interface ZeilenAnfang {
  tok: Token;
  einzug: number;
  zeilenStart: number;
}

interface BlockInfo {
  eltern: BlockInfo | null;
  tiefe: number;
  zeilen: ZeilenAnfang[];
  auf?: ZeilenAnfang;
  zu?: ZeilenAnfang;
  kinder: BlockInfo[];
  soll: number;
}

const TIPP =
  'Rücke nach jeder { um vier Leerzeichen weiter ein und gehe bei jeder } wieder zurück. So siehst du sofort, welche Anweisung zu welchem Block gehört – und fehlende Klammern fallen auf.';

function haeufigster(werte: number[]): number | null {
  const anzahl = new Map<number, number>();
  let bester: number | null = null;
  for (const w of werte) {
    const n = (anzahl.get(w) ?? 0) + 1;
    anzahl.set(w, n);
    if (bester === null || n > anzahl.get(bester)!) bester = w;
  }
  return bester;
}

export function pruefeEinrueckung(quelltext: string): Diagnose[] {
  const tokens = lex(quelltext).tokens.filter((t) => t.art !== 'ende');
  const wurzel: BlockInfo = { eltern: null, tiefe: 0, zeilen: [], kinder: [], soll: 0 };
  let aktuell = wurzel;

  const istZeichen = (t: Token | undefined, text: string): boolean => t !== undefined && t.art === 'zeichen' && t.text === text;

  tokens.forEach((tok, i) => {
    const vorher = tokens[i - 1];
    const ersterDerZeile = !vorher || vorher.zeile !== tok.zeile;
    let anfang: ZeilenAnfang | null = null;
    if (ersterDerZeile) {
      const zeilenStart = tok.von - (tok.spalte - 1);
      let einzug = 0;
      for (const c of quelltext.slice(zeilenStart, tok.von)) einzug += c === '\t' ? 4 - (einzug % 4) : 1;
      anfang = { tok, einzug, zeilenStart };
    }

    if (istZeichen(tok, '{')) {
      const neu: BlockInfo = { eltern: aktuell, tiefe: aktuell.tiefe + 1, zeilen: [], kinder: [], soll: 0 };
      if (anfang) neu.auf = anfang;
      aktuell.kinder.push(neu);
      aktuell = neu;
      return;
    }
    if (istZeichen(tok, '}')) {
      if (aktuell.eltern) {
        if (anfang) aktuell.zu = anfang;
        aktuell = aktuell.eltern;
      }
      return;
    }
    // Nur Zeilen, die eine neue Anweisung beginnen; Fortsetzungszeilen dürfen frei eingerückt sein.
    const beginntAnweisung = !vorher || istZeichen(vorher, ';') || istZeichen(vorher, '{') || istZeichen(vorher, '}');
    if (anfang && beginntAnweisung) aktuell.zeilen.push(anfang);
  });

  // Schrittweite aus dem ersten sauber eingerückten Block ableiten, sonst 4.
  let einheit = 4;
  const sucheEinheit = (b: BlockInfo, elternEinzug: number): boolean => {
    const eigen = haeufigster(b.zeilen.map((z) => z.einzug));
    if (b.eltern && eigen !== null && eigen > elternEinzug) {
      einheit = eigen - elternEinzug;
      return true;
    }
    return b.kinder.some((k) => sucheEinheit(k, eigen ?? elternEinzug));
  };
  sucheEinheit(wurzel, 0);

  const diagnosen: Diagnose[] = [];
  const melde = (z: ZeilenAnfang, soll: number, text: string): void => {
    if (z.einzug === soll) return;
    diagnosen.push({
      code: 'einrueckung',
      schwere: 'stil',
      pos: { von: z.tok.von, bis: z.tok.bis, zeile: z.tok.zeile, spalte: z.tok.spalte, endZeile: z.tok.zeile },
      text: `${text} Zeile ${z.tok.zeile} beginnt mit ${z.einzug} Leerzeichen, passend wären ${soll}.`,
      tipp: TIPP,
      reparatur: { von: z.zeilenStart, bis: z.tok.von, ersatz: ' '.repeat(soll) },
    });
  };

  const pruefe = (b: BlockInfo): void => {
    const eigen = haeufigster(b.zeilen.map((z) => z.einzug));
    if (!b.eltern) b.soll = eigen ?? 0;
    else b.soll = eigen !== null && eigen > b.eltern.soll ? eigen : b.eltern.soll + einheit;

    for (const z of b.zeilen) {
      melde(
        z,
        b.soll,
        b.tiefe === 0
          ? 'Die Einrückung passt nicht: Diese Zeile steht außerhalb aller geschweiften Klammern.'
          : `Die Einrückung passt nicht zur Klammertiefe: Diese Zeile steht ${b.tiefe} geschweifte ${b.tiefe === 1 ? 'Klammer' : 'Klammern'} tief und sollte so weit eingerückt sein wie die anderen Zeilen desselben Blocks.`,
      );
    }
    if (b.eltern) {
      if (b.auf) melde(b.auf, b.eltern.soll, 'Die öffnende `{` sollte genau unter dem Anfang der Zeile stehen, zu der sie gehört.');
      if (b.zu) melde(b.zu, b.eltern.soll, 'Die schließende `}` sollte auf derselben Höhe stehen wie der Anfang des Konstrukts, das sie beendet.');
    }
    b.kinder.forEach(pruefe);
  };
  pruefe(wurzel);

  return diagnosen.sort((a, b) => a.pos.von - b.pos.von);
}
