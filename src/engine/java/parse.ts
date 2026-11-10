import type { Diagnose, Programm } from './ast';
import { lex } from './lexer';
import { parseTokens, type ParseRoh } from './parser';
import { pruefe } from './pruefung';

/** Mehr echte Meldungen auf einmal überfordern; alles Weitere gilt als mögliche Folge der ersten. */
const MAX_ECHTE_FEHLER = 5;

export interface ParseErgebnis {
  /** Ausführbares Programm; null, sobald es eine Diagnose der Schwere 'fehler' oder 'nicht-unterstuetzt' gibt. */
  programm: Programm | null;
  /** Lexer-, Parser- und Prüfmeldungen, nach Position sortiert. */
  diagnosen: Diagnose[];
  /** Der Baum, so weit er trotz Fehlern gebaut werden konnte (kann Lücken enthalten) – nur zum Anzeigen. */
  entwurf: Programm | null;
}

export function parse(quelltext: string, opt?: { nurMethoden?: boolean }): ParseErgebnis {
  let roh: ParseRoh;
  let diagnosen: Diagnose[];
  try {
    const gelext = lex(quelltext);
    roh = parseTokens(quelltext, gelext, opt?.nurMethoden === true);
    // Ein offener Kommentar oder Text verschluckt Code; was der Parser danach vermisst, ist nur die Folge davon.
    const kommentarOffen = gelext.diagnosen.some((d) => d.code === 'kommentar-offen');
    const offeneTexte = gelext.diagnosen.filter((d) => d.code === 'text-offen');
    for (const d of roh.diagnosen) {
      if (d.schwere !== 'fehler') continue;
      if (kommentarOffen || offeneTexte.some((t) => t.pos.zeile === d.pos.zeile && t.pos.von <= d.pos.von)) {
        d.folgefehler = true;
        delete d.reparatur;
      }
    }
    diagnosen = [...gelext.diagnosen, ...roh.diagnosen];
    // Auf einem lückenhaften Baum wären Namens- und Typfehler nur Folgen der Syntaxfehler.
    if (roh.entwurf && !roh.unsauber) diagnosen.push(...pruefe(roh.entwurf));
  } catch {
    // Praktisch nur bei absurd tief verschachtelten Ausdrücken (Stapelüberlauf des Parsers).
    return {
      programm: null,
      entwurf: null,
      diagnosen: [
        {
          code: 'zu-verschachtelt',
          schwere: 'fehler',
          pos: { von: 0, bis: 0, zeile: 1, spalte: 1, endZeile: 1 },
          text: 'Der Quelltext ist so tief verschachtelt, dass die App ihn nicht lesen kann. Vereinfache die Klammern und Blöcke.',
        },
      ],
    };
  }

  diagnosen = diagnosen
    .map((d, index) => ({ d, index }))
    .sort((a, b) => a.d.pos.von - b.d.pos.von || a.index - b.index)
    .map(({ d }) => d);

  let echte = 0;
  for (const d of diagnosen) {
    if (d.schwere !== 'fehler' || d.folgefehler) continue;
    echte++;
    if (echte > MAX_ECHTE_FEHLER) d.folgefehler = true;
  }

  const ausfuehrbar = diagnosen.every((d) => d.schwere !== 'fehler' && d.schwere !== 'nicht-unterstuetzt');
  return { programm: ausfuehrbar ? roh.entwurf : null, diagnosen, entwurf: roh.entwurf };
}
