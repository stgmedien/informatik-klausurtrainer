// Fehlertoleranter Parser für das Schul-Java-Subset (rekursiver Abstieg).
// Leitlinie: typische Schülerfehler gezielt erkennen, den Baum so weiterbauen, als wäre der Fehler
// schon behoben, und nur dann Tokens überspringen, wenn es nicht anders geht.

import { aehnliche } from './aehnlich';
import type {
  Anweisung,
  Aufruf,
  AufrufAnw,
  Ausdruck,
  Binaer,
  BinaerOp,
  Block,
  Diagnose,
  Einfach,
  FeldDekl,
  Import,
  Inkrement,
  Klammer,
  Klasse,
  Knoten,
  Kommentar,
  Konstruktor,
  Leer,
  Luecke,
  Methode,
  Mitglied,
  Parameter,
  Pos,
  Programm,
  Rueckgabe,
  Sicht,
  Solange,
  Typ,
  Unaer,
  Var,
  VarDekl,
  Wahrheit,
  Wenn,
  WertTyp,
  Wiederhole,
  Zaehl,
  Zahl,
  Zuweisung,
} from './ast';
import { EINGEBAUT } from './builtins';
import { FREMDE_WORTE, tokenPos, type LexErgebnis, type Token } from './lexer';

/** Wird geworfen, wenn eine Anweisung nicht zu retten ist; die nächste Fangstelle überspringt sie. */
class Abbruch {}

interface OffenerBlock {
  tok: Token;
  art: 'klasse' | 'methode' | 'block';
  zeile: number;
  name?: string;
  wort?: string;
}

type RumpfWort = 'if' | 'else' | 'while' | 'for' | 'do';

const EBENEN: BinaerOp[][] = [['||'], ['&&'], ['|'], ['&'], ['==', '!='], ['<', '<=', '>', '>='], ['+', '-'], ['*', '/', '%']];
const WORT_ODER = new Set(['oder', 'or', 'ODER', 'OR']);
const WORT_UND = new Set(['und', 'and', 'UND', 'AND']);
const WORT_NICHT = new Set(['nicht', 'not', 'NICHT', 'NOT']);
const MODIFIZIERER = new Set(['public', 'private', 'protected', 'static', 'final', 'abstract']);
const FREMDE_TYPEN = new Set(['double', 'float', 'long', 'short', 'byte', 'char']);
const AUSDRUCK_START_ZEICHEN = new Set(['(', '!', '-', '+', '++', '--', '~']);
const AUSDRUCK_START_WORTE = new Set(['true', 'false', 'this', 'new', 'null', 'super']);

const TIPP_KLAMMERN =
  'Schreibe zu jeder { sofort die passende } genau darunter und fülle den Block erst danach. Zähle am Ende jeder Methode die Klammern nach.';
const TIPP_SEMIKOLON =
  'Jede einfache Anweisung (Methodenaufruf, Zuweisung, Deklaration, return) endet mit einem Semikolon. Hinter geschweiften Klammern steht keins.';
const TIPP_KEIN_SEMIKOLON =
  'Hinter der runden Klammer von if, while und for steht nie ein Semikolon – direkt danach kommt die geschweifte Klammer.';

function typTippfehler(text: string): WertTyp | null {
  const klein = text.toLowerCase();
  if (klein === 'integer') return 'int';
  if (klein === 'bool') return 'boolean';
  return aehnliche(text, ['boolean']) ? 'boolean' : null;
}

export interface ParseRoh {
  entwurf: Programm | null;
  diagnosen: Diagnose[];
  /** true, wenn Teile übersprungen wurden – der Baum ist dann lückenhaft und wird nicht typgeprüft. */
  unsauber: boolean;
}

export function parseTokens(quelltext: string, lexErgebnis: LexErgebnis, nurMethoden: boolean): ParseRoh {
  return new Parser(quelltext, lexErgebnis.tokens, lexErgebnis.kommentare).datei(nurMethoden);
}

class Parser {
  private p = 0;
  private readonly diagnosen: Diagnose[] = [];
  private readonly gemeldet = new Set<string>();
  private readonly knoten = new Map<number, Knoten>();
  private naechsteId = 1;
  private unsauber = false;
  private readonly offen: OffenerBlock[] = [];
  /** Gesetzt, sobald mitten in einem Rumpf ein neues Mitglied beginnt; alle offenen Blöcke geben dann auf. */
  private mitgliedAbbruch = false;
  private eofGemeldet = false;
  private methodenKontext: { name: string; zeile: number; rueckgabe: Typ } | null = null;
  private letzteMethode: { name: string; endZeile: number } | null = null;
  private readonly bekannteMethoden = new Set<string>(EINGEBAUT.map((e) => e.name));
  private klassenName = 'Tarantel';
  private bedingungTiefe = 0;
  private ausserhalbGemeldet = false;
  private vorgabe: Ausdruck | null = null;
  /** Tokenindex direkt hinter dem Block, der auf `if (...);` folgte – erklärt ein anschließendes `else`. */
  private elseErklaerung: { index: number; zeile: number; diagnose: Diagnose } | null = null;
  private ifSemikolonBlock: { index: number; zeile: number; diagnose: Diagnose } | null = null;

  constructor(
    private readonly quelltext: string,
    private readonly t: Token[],
    private readonly kommentare: Kommentar[],
  ) {
    for (let i = 0; i + 2 < t.length; i++) {
      const typ = t[i];
      if (typ.art === 'wort' && (typ.text === 'void' || typ.text === 'int' || typ.text === 'boolean')) {
        if (t[i + 1].art === 'bez' && this.ist('(', t[i + 2])) this.bekannteMethoden.add(t[i + 1].text);
      }
    }
  }

  // ---------- Token-Hilfen ----------

  private get akt(): Token {
    return this.t[this.p];
  }

  private vor(k: number): Token {
    return this.t[Math.min(this.p + k, this.t.length - 1)];
  }

  private ist(text: string, tok: Token = this.akt): boolean {
    return (tok.art === 'zeichen' || tok.art === 'wort') && tok.text === text;
  }

  private istEnde(): boolean {
    return this.akt.art === 'ende';
  }

  private istTyp(tok: Token = this.akt): boolean {
    return tok.art === 'wort' && (tok.text === 'int' || tok.text === 'boolean');
  }

  private nimm(): Token {
    const tok = this.akt;
    if (tok.art !== 'ende') this.p++;
    return tok;
  }

  /** Position vom Starttoken bis zum zuletzt verbrauchten Token. */
  private spanne(start: Token): Pos {
    if (this.p <= start.index) {
      return { von: start.von, bis: start.von, zeile: start.zeile, spalte: start.spalte, endZeile: start.zeile };
    }
    const ende = this.t[this.p - 1];
    return { von: start.von, bis: ende.bis, zeile: start.zeile, spalte: start.spalte, endZeile: ende.zeile };
  }

  /** Letztes Zeichen des vorigen Tokens (zum Markieren) und der Offset direkt dahinter (zum Einfügen). */
  private hinterVorig(): { pos: Pos; offset: number } {
    if (this.p === 0) return { pos: { von: 0, bis: 0, zeile: 1, spalte: 1, endZeile: 1 }, offset: 0 };
    const v = this.t[this.p - 1];
    const spalte = v.spalte + (v.bis - v.von) - 1;
    return { pos: { von: v.bis - 1, bis: v.bis, zeile: v.zeile, spalte, endZeile: v.zeile }, offset: v.bis };
  }

  private kurz(von: number, bis: number, max = 40): string {
    const text = this.quelltext.slice(von, bis).replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  private einzug(tok: Token): string {
    const zeilenStart = tok.von - (tok.spalte - 1);
    return /^[ \t]*/.exec(this.quelltext.slice(zeilenStart, tok.von))![0];
  }

  private mk<K extends Knoten>(start: Token, rest: Omit<K, 'id' | 'pos'>, pos?: Pos): K {
    const k = { ...rest, id: this.naechsteId++, pos: pos ?? this.spanne(start) } as unknown as K;
    this.knoten.set(k.id, k);
    return k;
  }

  private luecke(start: Token): Luecke {
    this.unsauber = true;
    return this.mk<Luecke>(start, { art: 'Luecke' });
  }

  // ---------- Meldungen ----------

  private melde(d: Diagnose): void {
    // Einfüge-Reparaturen dürfen sich an derselben Stelle wiederholen (zwei fehlende Klammern); alles andere nicht.
    if (!d.reparatur) {
      const schluessel = `${d.code}@${d.pos.von}`;
      if (this.gemeldet.has(schluessel)) return;
      this.gemeldet.add(schluessel);
    }
    this.diagnosen.push(d);
  }

  private fehler(code: string, pos: Pos, text: string, extra: Partial<Diagnose> = {}): void {
    // Während offene Blöcke abgewickelt werden, wären weitere Meldungen nur Folgen des schon gemeldeten Fehlers.
    if (this.mitgliedAbbruch || this.eofGemeldet) return;
    this.melde({ code, schwere: 'fehler', pos, text, ...extra });
  }

  private warnung(code: string, pos: Pos, text: string, extra: Partial<Diagnose> = {}): Diagnose {
    const d: Diagnose = { code, schwere: 'warnung', pos, text, ...extra };
    this.melde(d);
    return d;
  }

  private nichtUnterstuetzt(pos: Pos, was: string, tipp?: string): void {
    this.unsauber = true;
    this.melde({
      code: 'nicht-unterstuetzt',
      schwere: 'nicht-unterstuetzt',
      pos,
      text: `Das kann die App nicht ausführen: ${was}`,
      ...(tipp ? { tipp } : {}),
    });
  }

  private unerwartet(tok: Token): void {
    this.unsauber = true;
    if (tok.art === 'ende') return;
    this.fehler('unerwartet', tokenPos(tok), `Mit \`${tok.text}\` kann Java an dieser Stelle nichts anfangen.`, {
      javac: 'illegal start of expression',
    });
  }

  private beschreibe(o: OffenerBlock): string {
    if (o.art === 'klasse') return `die Klasse \`${o.name}\` (Zeile ${o.zeile})`;
    if (o.art === 'methode') return `die Methode \`${o.name}\` (Zeile ${o.zeile})`;
    if (o.wort) return `der \`${o.wort}\`-Block (Zeile ${o.zeile})`;
    return `der Block, der in Zeile ${o.zeile} mit \`{\` beginnt`;
  }

  private aufzaehlung(teile: string[]): string {
    if (teile.length <= 1) return teile.join('');
    return `${teile.slice(0, -1).join(', ')} und ${teile[teile.length - 1]}`;
  }

  private schliessende(offene: OffenerBlock[]): string {
    return offene
      .slice()
      .reverse()
      .map((o) => `\n${this.einzug(o.tok)}}`)
      .join('');
  }

  private meldeDateiende(): void {
    if (this.eofGemeldet) return;
    const offene = this.offen.slice();
    const n = offene.length;
    const { pos } = this.hinterVorig();
    const liste = this.aufzaehlung(offene.slice().reverse().map((o) => this.beschreibe(o)));
    this.fehler(
      'klammer-geschweift',
      pos,
      n <= 1
        ? `Am Ende des Programms fehlt eine schließende geschweifte Klammer \`}\`. Noch offen ist ${liste || 'ein Block'}.`
        : `Am Ende des Programms fehlen ${n} schließende geschweifte Klammern \`}\`. Noch offen sind ${liste}.`,
      {
        javac: 'reached end of file while parsing',
        tipp: TIPP_KLAMMERN,
        reparatur: { von: this.quelltext.length, bis: this.quelltext.length, ersatz: `${this.schliessende(offene) || '\n}'}\n` },
      },
    );
    this.unsauber = true;
    this.eofGemeldet = true;
  }

  private istMitgliedBeginn(): boolean {
    const a = this.akt;
    if (a.art !== 'wort') return false;
    if (a.text === 'public' || a.text === 'private' || a.text === 'protected' || a.text === 'static' || a.text === 'void') {
      return true;
    }
    return this.istTyp(a) && this.vor(1).art === 'bez' && this.ist('(', this.vor(2));
  }

  private meldeMethodeOffen(): void {
    const offene = this.offen.filter((o) => o.art !== 'klasse');
    const n = offene.length;
    const a = this.akt;
    const m = offene.find((o) => o.art === 'methode');
    const { offset } = this.hinterVorig();
    let text: string;
    if (n === 1 && m) {
      text = `Die Methode \`${m.name}\` aus Zeile ${m.zeile} ist noch nicht geschlossen: Vor \`${a.text}\` in Zeile ${a.zeile} fehlt eine schließende geschweifte Klammer \`}\`.`;
    } else {
      const liste = this.aufzaehlung(offene.slice().reverse().map((o) => this.beschreibe(o)));
      const kopf = m ? `Die Methode \`${m.name}\` aus Zeile ${m.zeile} ist noch nicht geschlossen: ` : '';
      text =
        n === 1
          ? `${kopf}Vor \`${a.text}\` in Zeile ${a.zeile} fehlt eine schließende geschweifte Klammer \`}\`. Noch offen ist ${liste}.`
          : `${kopf}Vor \`${a.text}\` in Zeile ${a.zeile} fehlen ${n} schließende geschweifte Klammern \`}\`. Noch offen sind ${liste}.`;
    }
    this.fehler('klammer-geschweift', tokenPos(a), text, {
      javac: 'illegal start of expression',
      tipp: TIPP_KLAMMERN,
      reparatur: { von: offset, bis: offset, ersatz: this.schliessende(offene) },
    });
    this.unsauber = true;
    this.mitgliedAbbruch = true;
  }

  // ---------- Datei und Klasse ----------

  datei(nurMethoden: boolean): ParseRoh {
    const start = this.akt;
    const importe: Import[] = [];
    for (;;) {
      if (this.ist('import')) importe.push(this.importZeile());
      else if (this.ist('package')) {
        this.nichtUnterstuetzt(tokenPos(this.akt), '`package`-Angaben. Lass die Zeile einfach weg.');
        this.synchronisiere();
      } else break;
    }

    let klasse: Klasse | null = null;
    let ohneRahmen = false;
    if (this.beginntKlasse()) {
      klasse = this.klasse();
    } else if (nurMethoden) {
      ohneRahmen = true;
      klasse = this.ohneRahmen();
    } else if (this.istEnde()) {
      this.fehler(
        'klasse-fehlt',
        tokenPos(start),
        'Hier steht noch kein Programm. Ein Java-Programm besteht aus einer Klasse: `public class Tarantel extends Spinne { … }`.',
        { javac: 'class, interface, enum, or record expected' },
      );
    } else {
      this.fehler(
        'klasse-fehlt',
        tokenPos(this.akt),
        'Der Quelltext beginnt nicht mit einer Klasse. Methoden müssen in Java immer im Rumpf einer Klasse stehen: `public class Tarantel extends Spinne { … }`.',
        { javac: 'class, interface, enum, or record expected', tipp: 'Die erste Zeile nach den import-Zeilen ist immer der Klassenkopf.' },
      );
      ohneRahmen = true;
      klasse = this.ohneRahmen();
    }

    if (!klasse) return { entwurf: null, diagnosen: this.diagnosen, unsauber: true };

    const letzte = this.t[this.t.length - 1];
    const pos: Pos = { von: 0, bis: this.quelltext.length, zeile: 1, spalte: 1, endZeile: letzte.zeile };
    const programm = this.mk<Programm>(
      start,
      {
        art: 'Programm',
        importe,
        klasse,
        kommentare: this.kommentare,
        quelltext: this.quelltext,
        knoten: this.knoten,
        nurMethoden: ohneRahmen,
      },
      pos,
    );
    return { entwurf: programm, diagnosen: this.diagnosen, unsauber: this.unsauber };
  }

  private beginntKlasse(): boolean {
    let k = 0;
    while (this.vor(k).art === 'wort' && MODIFIZIERER.has(this.vor(k).text)) k++;
    return this.ist('class', this.vor(k));
  }

  private importZeile(): Import {
    const start = this.nimm();
    let name = '';
    let letzter = start;
    while ((this.akt.art === 'bez' || this.ist('.') || this.ist('*')) && this.akt.zeile === letzter.zeile) {
      letzter = this.nimm();
      name += letzter.text;
    }
    if (name === '') {
      this.fehler('bezeichner-erwartet', this.hinterVorig().pos, 'Nach `import` fehlt, was importiert werden soll, z.B. `import greenfoot.*;`.', {
        javac: '<identifier> expected',
      });
    }
    this.semikolon(start);
    return this.mk<Import>(start, { art: 'Import', name });
  }

  private klassenKnoten(start: Token, name: string, oberklasse: string | undefined, mitglieder: Mitglied[], pos: Pos): Klasse {
    return this.mk<Klasse>(
      start,
      {
        art: 'Klasse',
        name,
        ...(oberklasse ? { oberklasse } : {}),
        mitglieder,
        felder: mitglieder.filter((m): m is FeldDekl => m.art === 'Feld'),
        konstruktoren: mitglieder.filter((m): m is Konstruktor => m.art === 'Konstruktor'),
        methoden: mitglieder.filter((m): m is Methode => m.art === 'Methode'),
      },
      pos,
    );
  }

  private ohneRahmen(): Klasse {
    const start = this.akt;
    this.klassenName = 'Tarantel';
    const mitglieder: Mitglied[] = [];
    this.mitgliederSchleife(mitglieder, false);
    const letzte = this.t[this.t.length - 1];
    const pos: Pos = { von: 0, bis: this.quelltext.length, zeile: 1, spalte: 1, endZeile: letzte.zeile };
    return this.klassenKnoten(start, 'Tarantel', 'Spinne', mitglieder, pos);
  }

  private klasse(): Klasse {
    const start = this.akt;
    while (this.akt.art === 'wort' && MODIFIZIERER.has(this.akt.text)) {
      const m = this.nimm();
      if (m.text !== 'public') this.nichtUnterstuetzt(tokenPos(m), `das Schlüsselwort \`${m.text}\` vor \`class\`.`);
    }
    this.nimm();
    let name = 'Tarantel';
    if (this.akt.art === 'bez') name = this.nimm().text;
    else {
      this.fehler('bezeichner-erwartet', this.hinterVorig().pos, 'Nach `class` fehlt der Name der Klasse, z.B. `class Tarantel`.', {
        javac: '<identifier> expected',
      });
    }
    this.klassenName = name;

    let oberklasse: string | undefined;
    if (this.ist('extends')) {
      this.nimm();
      if (this.akt.art === 'bez') oberklasse = this.nimm().text;
      else {
        this.fehler('bezeichner-erwartet', this.hinterVorig().pos, 'Nach `extends` fehlt der Name der Oberklasse, z.B. `extends Spinne`.', {
          javac: '<identifier> expected',
        });
      }
    }
    if (this.ist('implements')) {
      this.nichtUnterstuetzt(tokenPos(this.akt), '`implements` (Schnittstellen).');
      while (!this.istEnde() && !this.ist('{')) this.nimm();
    }

    let hatKlammer = false;
    if (this.ist('{')) {
      hatKlammer = true;
      this.offen.push({ tok: this.nimm(), art: 'klasse', zeile: start.zeile, name });
    } else {
      const { pos, offset } = this.hinterVorig();
      this.fehler('klammer-geschweift', pos, `Nach dem Klassenkopf von \`${name}\` fehlt die öffnende geschweifte Klammer \`{\`.`, {
        javac: "'{' expected",
        tipp: TIPP_KLAMMERN,
        reparatur: { von: offset, bis: offset, ersatz: '\n{' },
      });
      this.unsauber = true;
    }

    const mitglieder: Mitglied[] = [];
    this.mitgliederSchleife(mitglieder, true);
    let endTok: Token | null = null;
    if (this.ist('}')) endTok = this.nimm();
    else if (hatKlammer) this.meldeDateiende();
    if (hatKlammer) this.offen.pop();
    const pos = this.spanne(start);

    let gemeldet = false;
    while (!this.istEnde()) {
      if (this.ist(';')) {
        this.nimm();
        continue;
      }
      if (this.beginntKlasse()) {
        this.nichtUnterstuetzt(tokenPos(this.akt), 'mehrere Klassen in einem Programm. Die App führt nur die erste Klasse aus.');
        this.p = this.t.length - 1;
        break;
      }
      if (!gemeldet) {
        gemeldet = true;
        const zeile = endTok ? endTok.zeile : start.zeile;
        if (this.ist('}')) {
          this.fehler(
            'klammer-geschweift',
            tokenPos(this.akt),
            `Diese schließende geschweifte Klammer \`}\` ist zu viel: Die Klasse \`${name}\` wurde schon in Zeile ${zeile} geschlossen.`,
            {
              javac: 'class, interface, enum, or record expected',
              tipp: TIPP_KLAMMERN,
              reparatur: { von: this.akt.von, bis: this.akt.bis, ersatz: '' },
            },
          );
        } else {
          this.fehler(
            'klammer-geschweift',
            tokenPos(this.akt),
            `Die Klasse \`${name}\` wurde schon in Zeile ${zeile} mit \`}\` geschlossen – was ab hier kommt, steht außerhalb der Klasse. Vermutlich ist weiter oben eine \`}\` zu viel.`,
            {
              javac: 'class, interface, enum, or record expected',
              tipp: TIPP_KLAMMERN,
              ...(endTok ? { reparatur: { von: endTok.von, bis: endTok.bis, ersatz: '' } } : {}),
            },
          );
        }
        this.unsauber = true;
      }
      if (this.ist('}')) {
        this.nimm();
        continue;
      }
      this.mitgliederSchleife(mitglieder, true);
    }
    return this.klassenKnoten(start, name, oberklasse, mitglieder, pos);
  }

  private mitgliederSchleife(ziel: Mitglied[], imRahmen: boolean): void {
    while (!this.istEnde()) {
      if (this.ist('}')) {
        if (imRahmen) {
          // Nach Anweisungen außerhalb einer Methode gehört die nächste `}` meist noch zu der zu früh
          // geschlossenen Methode, nicht zur Klasse.
          if (this.ausserhalbGemeldet && this.vor(1).art !== 'ende') {
            this.nimm();
            this.ausserhalbGemeldet = false;
            continue;
          }
          return;
        }
        this.fehler('klammer-geschweift', tokenPos(this.akt), 'Diese schließende geschweifte Klammer `}` ist zu viel: Zu ihr gibt es keine öffnende `{`.', {
          javac: 'class, interface, enum, or record expected',
          tipp: TIPP_KLAMMERN,
          reparatur: { von: this.akt.von, bis: this.akt.bis, ersatz: '' },
        });
        this.unsauber = true;
        this.nimm();
        continue;
      }
      const vorher = this.p;
      const m = this.mitglied();
      if (m) ziel.push(m);
      if (this.p === vorher) {
        this.unerwartet(this.akt);
        this.nimm();
      }
    }
  }

  private mitglied(): Mitglied | null {
    try {
      return this.mitgliedInnen(this.akt);
    } catch (e) {
      if (!(e instanceof Abbruch)) throw e;
      this.synchronisiere();
      return null;
    } finally {
      this.mitgliedAbbruch = false;
      this.methodenKontext = null;
    }
  }

  private mitgliedInnen(start: Token): Mitglied | null {
    if (this.ist(';')) {
      this.nimm();
      return null;
    }
    if (this.ist('@')) {
      const at = this.nimm();
      if (this.akt.art === 'bez') this.nimm();
      this.nichtUnterstuetzt(this.spanne(at), 'Annotationen wie `@Override`. Lass die Zeile einfach weg.');
      return null;
    }

    let sicht: Sicht | undefined;
    while (this.akt.art === 'wort' && MODIFIZIERER.has(this.akt.text)) {
      const m = this.nimm();
      if (m.text === 'public' || m.text === 'private') sicht = m.text;
      else {
        this.nichtUnterstuetzt(tokenPos(m), `das Schlüsselwort \`${m.text}\`. Die App kennt nur \`public\` und \`private\`.`);
        throw new Abbruch();
      }
    }

    const a = this.akt;
    let typ: Typ | null = null;
    if (this.istTyp(a) || this.ist('void')) {
      typ = this.nimm().text as Typ;
    } else if (a.art === 'bez' && this.vor(1).art === 'bez') {
      const ersatz = typTippfehler(a.text);
      if (ersatz) {
        this.meldeTypTippfehler(a, ersatz);
        this.nimm();
        typ = ersatz;
      } else {
        this.nichtUnterstuetzt(
          tokenPos(a),
          `Attribute und Methoden vom Typ \`${a.text}\`. Die App kennt nur \`int\`, \`boolean\` und \`void\`.`,
        );
        throw new Abbruch();
      }
    } else if (a.art === 'wort' && FREMDE_TYPEN.has(a.text)) {
      this.nichtUnterstuetzt(tokenPos(a), `den Typ \`${a.text}\`. Die App kennt nur \`int\`, \`boolean\` und \`void\`.`);
      throw new Abbruch();
    }

    if (typ) {
      if (this.ist('[')) {
        this.nichtUnterstuetzt(tokenPos(this.akt), 'Arrays (Felder mit eckigen Klammern).');
        throw new Abbruch();
      }
      if (this.akt.art !== 'bez') {
        this.fehler(
          'bezeichner-erwartet',
          this.hinterVorig().pos,
          typ === 'void' ? 'Nach `void` fehlt der Name der Methode.' : `Nach dem Typ \`${typ}\` fehlt ein Name.`,
          { javac: '<identifier> expected' },
        );
        throw new Abbruch();
      }
      const nameTok = this.nimm();
      if (this.ist('(')) return this.methode(start, sicht, typ, nameTok, true);
      if (this.ist('{')) {
        this.fehler(
          'klammer-rund-fehlt',
          tokenPos(nameTok),
          `Im Methodenkopf fehlen nach dem Namen \`${nameTok.text}\` die runden Klammern. Auch ohne Parameter schreibt man \`${nameTok.text}()\`.`,
          {
            javac: "'(' expected",
            tipp: 'Ein Methodenkopf hat immer die Form: Sichtbarkeit, Rückgabetyp, Name, runde Klammern – z.B. `public void wenden()`.',
            reparatur: { von: nameTok.bis, bis: nameTok.bis, ersatz: '()' },
          },
        );
        return this.methode(start, sicht, typ, nameTok, false);
      }
      if (typ === 'void') {
        this.fehler(
          'unerwartet',
          tokenPos(nameTok),
          `Nach \`void ${nameTok.text}\` erwartet Java einen Methodenkopf mit runden Klammern: \`void ${nameTok.text}()\`. Variablen können nicht vom Typ \`void\` sein.`,
          { javac: "'(' expected" },
        );
        throw new Abbruch();
      }
      return this.feld(start, sicht, typ, nameTok);
    }

    if (a.art === 'bez') {
      if (this.ist('(', this.vor(1))) {
        const zu = this.passendeKlammer(this.p + 1);
        if (zu >= 0 && this.ist('{', this.t[zu + 1])) {
          const nameTok = this.nimm();
          if (nameTok.text === this.klassenName) return this.konstruktor(start, sicht, nameTok);
          this.fehler(
            'rueckgabetyp-fehlt',
            tokenPos(nameTok),
            `Im Kopf der Methode \`${nameTok.text}\` fehlt der Rückgabetyp. Liefert die Methode nichts zurück, schreibt man \`void\` vor den Namen.`,
            {
              javac: 'invalid method declaration; return type required',
              tipp: 'Ein Methodenkopf hat immer die Form: Sichtbarkeit, Rückgabetyp, Name, runde Klammern – z.B. `public void wenden()`.',
              reparatur: { von: nameTok.von, bis: nameTok.von, ersatz: 'void ' },
            },
          );
          return this.methode(start, sicht, 'void', nameTok, true);
        }
      }
      const naechstes = this.vor(1);
      if (naechstes.art === 'wort' && (this.istTyp(naechstes) || naechstes.text === 'void')) {
        const v = aehnliche(a.text, ['public', 'private']);
        if (v) {
          const ersatz = v.namen[0];
          this.fehler('schluesselwort-falsch', tokenPos(a), `\`${a.text}\` kennt Java nicht. Meintest du \`${ersatz}\`?`, {
            javac: '<identifier> expected',
            reparatur: { von: a.von, bis: a.bis, ersatz },
          });
          this.nimm();
          return this.mitgliedInnen(start);
        }
      }
    }

    const istAnweisung =
      a.art === 'bez' ||
      this.ist('{') ||
      this.ist('++') ||
      this.ist('--') ||
      (a.art === 'wort' && ['if', 'while', 'for', 'do', 'return', 'else', 'this'].includes(a.text));
    if (istAnweisung) return this.anweisungAusserhalb();

    if (a.art === 'wort' && FREMDE_WORTE.has(a.text)) {
      this.nichtUnterstuetzt(tokenPos(a), `\`${a.text}\` an dieser Stelle.`);
      throw new Abbruch();
    }
    this.unerwartet(a);
    throw new Abbruch();
  }

  private meldeTypTippfehler(tok: Token, ersatz: WertTyp): void {
    this.fehler('typ-unbekannt', tokenPos(tok), `Den Typ \`${tok.text}\` gibt es in Java nicht. Meintest du \`${ersatz}\`?`, {
      javac: `cannot find symbol\n  symbol:   class ${tok.text}`,
      tipp: 'In der Spinnenwelt brauchst du nur zwei Typen: `int` für ganze Zahlen und `boolean` für wahr/falsch.',
      reparatur: { von: tok.von, bis: tok.bis, ersatz },
    });
  }

  /** Index der schließenden Klammer zu der öffnenden an `index`, oder -1. */
  private passendeKlammer(index: number): number {
    let tiefe = 0;
    for (let i = index; i < this.t.length; i++) {
      const tok = this.t[i];
      if (tok.art !== 'zeichen') continue;
      if (tok.text === '(') tiefe++;
      else if (tok.text === ')') {
        tiefe--;
        if (tiefe === 0) return i;
      } else if (tok.text === '{' || tok.text === '}' || tok.text === ';') return -1;
    }
    return -1;
  }

  private anweisungAusserhalb(): null {
    const start = this.akt;
    if (!this.ausserhalbGemeldet) {
      this.ausserhalbGemeldet = true;
      const davor = this.letzteMethode
        ? ` Die Methode \`${this.letzteMethode.name}\` davor endet schon in Zeile ${this.letzteMethode.endZeile} – vielleicht steht dort eine \`}\` zu früh oder zu viel.`
        : ' Es fehlt der Methodenkopf, z.B. `public void meineMethode()`, und die geschweiften Klammern darum.';
      this.fehler(
        'anweisung-ausserhalb',
        tokenPos(start),
        `Diese Anweisung steht außerhalb einer Methode. Anweisungen dürfen nur im Rumpf einer Methode stehen, also zwischen deren \`{\` und \`}\`.${davor}`,
        { javac: 'illegal start of type', tipp: TIPP_KLAMMERN },
      );
    }
    this.unsauber = true;
    const vorher = this.p;
    this.anweisung();
    if (this.p === vorher) this.nimm();
    return null;
  }

  private feld(start: Token, sicht: Sicht | undefined, typ: WertTyp, nameTok: Token): FeldDekl {
    let wert: Ausdruck | undefined;
    if (this.ist('=')) {
      this.nimm();
      wert = this.ausdruck();
    }
    if (this.ist(',')) {
      this.nichtUnterstuetzt(tokenPos(this.akt), 'mehrere Attribute in einer Deklaration. Schreibe für jedes Attribut eine eigene Zeile.');
      throw new Abbruch();
    }
    this.semikolon(start);
    this.ausserhalbGemeldet = false;
    return this.mk<FeldDekl>(start, {
      art: 'Feld',
      ...(sicht ? { sicht } : {}),
      typ,
      name: nameTok.text,
      ...(wert ? { wert } : {}),
    });
  }

  private parameterListe(): Parameter[] {
    const auf = this.nimm();
    const parameter: Parameter[] = [];
    while (!this.ist(')') && !this.ist('{') && !this.ist(';') && !this.istEnde()) {
      const pStart = this.akt;
      let typ: WertTyp = 'int';
      if (this.istTyp()) {
        typ = this.nimm().text as WertTyp;
      } else if (this.akt.art === 'bez' && this.vor(1).art === 'bez') {
        const ersatz = typTippfehler(this.akt.text);
        if (ersatz) {
          this.meldeTypTippfehler(this.akt, ersatz);
          typ = ersatz;
        } else {
          this.nichtUnterstuetzt(tokenPos(this.akt), `Parameter vom Typ \`${this.akt.text}\`. Die App kennt nur \`int\` und \`boolean\`.`);
        }
        this.nimm();
      } else if (this.akt.art === 'bez') {
        this.fehler(
          'parameter-typ-fehlt',
          tokenPos(this.akt),
          `Beim Parameter \`${this.akt.text}\` fehlt der Typ. Im Methodenkopf steht vor jedem Parameter sein Typ, z.B. \`int ${this.akt.text}\`.`,
          { javac: '<identifier> expected', reparatur: { von: this.akt.von, bis: this.akt.von, ersatz: 'int ' } },
        );
      } else if (this.akt.art === 'wort' && FREMDE_TYPEN.has(this.akt.text)) {
        this.nichtUnterstuetzt(tokenPos(this.akt), `Parameter vom Typ \`${this.akt.text}\`. Die App kennt nur \`int\` und \`boolean\`.`);
        this.nimm();
      } else {
        this.unerwartet(this.akt);
        throw new Abbruch();
      }

      if (this.akt.art === 'bez') {
        const nameTok = this.nimm();
        parameter.push(this.mk<Parameter>(pStart, { art: 'Parameter', typ, name: nameTok.text }));
      } else {
        this.fehler('bezeichner-erwartet', this.hinterVorig().pos, `Nach dem Typ \`${typ}\` fehlt der Name des Parameters, z.B. \`${typ} anzahl\`.`, {
          javac: '<identifier> expected',
        });
        this.unsauber = true;
      }

      if (this.ist(',')) {
        this.nimm();
        continue;
      }
      if (this.istTyp()) {
        const { pos, offset } = this.hinterVorig();
        this.fehler('komma-fehlt', pos, 'Zwischen zwei Parametern fehlt das Komma, z.B. `(int hoehe, int breite)`.', {
          javac: "',', ')', or '[' expected",
          reparatur: { von: offset, bis: offset, ersatz: ',' },
        });
        continue;
      }
      break;
    }
    if (this.ist(')')) this.nimm();
    else this.klammerZuFehlt(auf);
    return parameter;
  }

  private methodenRumpf(nameTok: Token, zeile: number): Block {
    if (this.ist(';')) {
      const semi = this.akt;
      if (this.ist('{', this.vor(1))) {
        this.fehler(
          'semikolon-nach-methodenkopf',
          tokenPos(semi),
          `Hinter dem Methodenkopf von \`${nameTok.text}\` steht ein Semikolon. Damit endet die Methode für Java schon hier, und der Block \`{ … }\` darunter gehört zu nichts mehr.`,
          {
            javac: 'missing method body, or declare abstract',
            tipp: 'Nach dem Methodenkopf folgt direkt die öffnende geschweifte Klammer – kein Semikolon.',
            reparatur: { von: semi.von, bis: semi.bis, ersatz: '' },
          },
        );
        this.nimm();
      } else {
        this.fehler(
          'methodenrumpf-fehlt',
          tokenPos(semi),
          `Die Methode \`${nameTok.text}\` hat keinen Rumpf. Nach dem Methodenkopf müssen die Anweisungen in geschweiften Klammern folgen: \`{ … }\`.`,
          { javac: 'missing method body, or declare abstract' },
        );
        this.unsauber = true;
        this.nimm();
        return this.mk<Block>(semi, { art: 'Block', anweisungen: [] });
      }
    }
    if (this.ist('throws')) {
      this.nichtUnterstuetzt(tokenPos(this.akt), '`throws` (Ausnahmen).');
      throw new Abbruch();
    }
    if (this.ist('{')) return this.block({ art: 'methode', name: nameTok.text, zeile });

    const { pos, offset } = this.hinterVorig();
    this.fehler('klammer-geschweift', pos, `Nach dem Methodenkopf von \`${nameTok.text}\` fehlt die öffnende geschweifte Klammer \`{\`.`, {
      javac: "';' expected",
      tipp: TIPP_KLAMMERN,
      reparatur: { von: offset, bis: offset, ersatz: ' {' },
    });
    this.unsauber = true;
    return this.block({ art: 'methode', name: nameTok.text, zeile }, true);
  }

  private methode(start: Token, sicht: Sicht | undefined, rueckgabe: Typ, nameTok: Token, mitKlammern: boolean): Methode {
    const parameter = mitKlammern ? this.parameterListe() : [];
    const kopf = this.spanne(start);
    this.ausserhalbGemeldet = false;
    this.methodenKontext = { name: nameTok.text, zeile: start.zeile, rueckgabe };
    const rumpf = this.methodenRumpf(nameTok, start.zeile);
    const m = this.mk<Methode>(start, {
      art: 'Methode',
      ...(sicht ? { sicht } : {}),
      rueckgabe,
      name: nameTok.text,
      parameter,
      rumpf,
      kopf,
    });
    this.letzteMethode = { name: m.name, endZeile: m.pos.endZeile };
    return m;
  }

  private konstruktor(start: Token, sicht: Sicht | undefined, nameTok: Token): Konstruktor {
    const parameter = this.parameterListe();
    const kopf = this.spanne(start);
    this.ausserhalbGemeldet = false;
    this.methodenKontext = { name: nameTok.text, zeile: start.zeile, rueckgabe: 'void' };
    const rumpf = this.methodenRumpf(nameTok, start.zeile);
    const k = this.mk<Konstruktor>(start, {
      art: 'Konstruktor',
      ...(sicht ? { sicht } : {}),
      name: nameTok.text,
      parameter,
      rumpf,
      kopf,
    });
    this.letzteMethode = { name: k.name, endZeile: k.pos.endZeile };
    return k;
  }

  // ---------- Anweisungen ----------

  private block(info: { art: 'methode' | 'block'; name?: string; wort?: string; zeile?: number; istDann?: boolean }, ohneOeffnung = false): Block {
    const start = this.akt;
    if (!ohneOeffnung) this.nimm();
    const nachIfSemikolon = this.ifSemikolonBlock?.index === start.index ? this.ifSemikolonBlock : null;
    this.offen.push({
      tok: start,
      art: info.art,
      zeile: info.zeile ?? start.zeile,
      ...(info.name ? { name: info.name } : {}),
      ...(info.wort ? { wort: info.wort } : {}),
    });
    const anweisungen: Anweisung[] = [];
    for (;;) {
      if (this.ist('}')) {
        this.nimm();
        break;
      }
      if (this.istEnde()) {
        this.meldeDateiende();
        break;
      }
      if (this.istMitgliedBeginn()) {
        if (!this.mitgliedAbbruch) this.meldeMethodeOffen();
        break;
      }
      if (info.istDann && this.ist('else')) {
        const { offset } = this.hinterVorig();
        this.fehler(
          'klammer-geschweift',
          tokenPos(this.akt),
          `Vor \`else\` fehlt die schließende geschweifte Klammer \`}\` des \`if\`-Blocks aus Zeile ${info.zeile ?? start.zeile}.`,
          {
            javac: "'else' without 'if'",
            tipp: TIPP_KLAMMERN,
            reparatur: { von: offset, bis: offset, ersatz: `\n${this.einzug(start)}}` },
          },
        );
        this.unsauber = true;
        break;
      }
      const vorher = this.p;
      const a = this.anweisung();
      if (a) anweisungen.push(a);
      if (this.mitgliedAbbruch) break;
      if (this.p === vorher) {
        this.unerwartet(this.akt);
        this.nimm();
      }
    }
    this.offen.pop();
    if (nachIfSemikolon) this.elseErklaerung = { ...nachIfSemikolon, index: this.p };
    return this.mk<Block>(start, { art: 'Block', anweisungen });
  }

  private anweisung(): Anweisung | null {
    const start = this.akt;
    try {
      return this.anweisungInnen(start);
    } catch (e) {
      if (!(e instanceof Abbruch)) throw e;
      this.synchronisiere();
      return this.luecke(start);
    }
  }

  /** Überspringt bis hinter das nächste `;` bzw. den nächsten vollständigen Block auf gleicher Tiefe. */
  private synchronisiere(): void {
    this.unsauber = true;
    let geschweift = 0;
    let rund = 0;
    while (!this.istEnde()) {
      const a = this.akt;
      if (a.art === 'zeichen') {
        if (a.text === '(') rund++;
        else if (a.text === ')') rund = Math.max(0, rund - 1);
        else if (a.text === '{') geschweift++;
        else if (a.text === '}') {
          if (geschweift === 0) return;
          geschweift--;
          if (geschweift === 0) {
            this.nimm();
            // Ein `else`-Zweig gehört noch zur übersprungenen Anweisung.
            if (this.ist('else')) continue;
            return;
          }
        } else if (a.text === ';' && geschweift === 0 && rund === 0) {
          this.nimm();
          return;
        }
      } else if (geschweift === 0 && a.art === 'wort' && (a.text === 'public' || a.text === 'private')) {
        return;
      }
      this.nimm();
    }
  }

  private anweisungInnen(start: Token): Anweisung | null {
    const a = this.akt;
    if (a.art === 'zeichen') {
      switch (a.text) {
        case '{':
          return this.block({ art: 'block' });
        case ';':
          this.nimm();
          return this.mk<Leer>(start, { art: 'Leer' });
        case '++':
        case '--': {
          const e = this.inkrementPraefix();
          this.semikolon(start);
          e.pos = this.spanne(start);
          return e;
        }
        case ')':
          this.fehler('klammer-rund-zuviel', tokenPos(a), 'Diese schließende runde Klammer `)` ist zu viel: Zu ihr gibt es keine öffnende `(`.', {
            javac: 'illegal start of expression',
            reparatur: { von: a.von, bis: a.bis, ersatz: '' },
          });
          this.nimm();
          return null;
        default:
          break;
      }
    }
    if (a.art === 'wort') {
      switch (a.text) {
        case 'if':
          return this.wenn();
        case 'while':
          return this.solange();
        case 'do':
          return this.wiederhole();
        case 'for':
          return this.zaehl();
        case 'return':
          return this.rueckgabe();
        case 'int':
        case 'boolean': {
          const d = this.varDekl(this.nimm().text as WertTyp, start, false);
          this.semikolon(start);
          d.pos = this.spanne(start);
          return d;
        }
        case 'else':
          return this.elseOhneIf();
        case 'this': {
          const e = this.einfachMitThis();
          this.semikolon(start);
          e.pos = this.spanne(start);
          return e;
        }
        case 'true':
        case 'false':
          this.fehler('keine-anweisung', tokenPos(a), `\`${a.text}\` allein ist keine Anweisung.`, { javac: 'not a statement' });
          throw new Abbruch();
        default:
          return this.fremdeAnweisung(a);
      }
    }
    if (a.art === 'bez') {
      const n = this.vor(1);
      if (n.art === 'bez' && n.zeile === a.zeile) {
        const ersatz = typTippfehler(a.text);
        if (ersatz) {
          this.meldeTypTippfehler(a, ersatz);
          this.nimm();
          const d = this.varDekl(ersatz, start, false);
          this.semikolon(start);
          d.pos = this.spanne(start);
          return d;
        }
        if (!this.istMethodenname(a.text)) {
          this.nichtUnterstuetzt(tokenPos(a), `Variablen vom Typ \`${a.text}\`. Die App kennt nur \`int\` und \`boolean\`.`);
          throw new Abbruch();
        }
      }
      const e = this.einfach();
      this.semikolon(start);
      e.pos = this.spanne(start);
      return e;
    }
    if (a.art === 'zahl' || a.art === 'text' || a.art === 'buchstabe') {
      this.fehler('keine-anweisung', tokenPos(a), `\`${a.text}\` allein ist keine Anweisung – es fehlt, was damit passieren soll.`, {
        javac: 'not a statement',
      });
      throw new Abbruch();
    }
    this.unerwartet(a);
    throw new Abbruch();
  }

  private fremdeAnweisung(a: Token): never {
    const pos = tokenPos(a);
    if (a.text === 'switch') {
      this.nichtUnterstuetzt(pos, '`switch`-Anweisungen.', 'Dasselbe erreichst du mit `if (…) { … } else if (…) { … } else { … }`.');
    } else if (a.text === 'break' || a.text === 'continue') {
      this.nichtUnterstuetzt(
        pos,
        `\`${a.text}\`.`,
        'Formuliere die Schleifenbedingung so, dass die Schleife von selbst endet, oder verlasse die Methode mit `return`.',
      );
    } else if (FREMDE_TYPEN.has(a.text)) {
      this.nichtUnterstuetzt(pos, `Variablen vom Typ \`${a.text}\`. Die App kennt nur \`int\` und \`boolean\`.`);
    } else if (a.text === 'final') {
      this.nichtUnterstuetzt(pos, 'Konstanten mit `final`. Lass `final` weg.');
    } else if (a.text === 'try' || a.text === 'catch' || a.text === 'finally' || a.text === 'throw') {
      this.nichtUnterstuetzt(pos, 'Ausnahmebehandlung (`try`, `catch`, `throw`).');
    } else if (FREMDE_WORTE.has(a.text)) {
      this.nichtUnterstuetzt(pos, `\`${a.text}\`.`);
    } else {
      this.unerwartet(a);
    }
    throw new Abbruch();
  }

  private semikolon(start: Token): void {
    if (this.ist(';')) {
      this.nimm();
      return;
    }
    if (this.ist(')')) {
      const zu = this.akt;
      this.fehler('klammer-rund-zuviel', tokenPos(zu), 'Diese schließende runde Klammer `)` ist zu viel: Zu ihr gibt es keine öffnende `(`.', {
        javac: 'illegal start of expression',
        reparatur: { von: zu.von, bis: zu.bis, ersatz: '' },
      });
      this.nimm();
      if (this.ist(';')) {
        this.nimm();
        return;
      }
    }
    const { pos, offset } = this.hinterVorig();
    const anweisung = this.kurz(start.von, offset);
    const naechstes = this.akt;
    if ((this.ist(':') || this.ist(',')) && (this.vor(1).zeile > naechstes.zeile || this.ist('}', this.vor(1)))) {
      this.fehler(
        'semikolon-fehlt',
        tokenPos(naechstes),
        `Nach \`${anweisung}\` in Zeile ${pos.zeile} steht \`${naechstes.text}\` statt eines Semikolons \`;\`.`,
        { javac: "';' expected", tipp: TIPP_SEMIKOLON, reparatur: { von: naechstes.von, bis: naechstes.bis, ersatz: ';' } },
      );
      this.nimm();
      return;
    }
    this.fehler('semikolon-fehlt', pos, `Nach \`${anweisung}\` in Zeile ${pos.zeile} fehlt das Semikolon \`;\`.`, {
      javac: "';' expected",
      tipp: TIPP_SEMIKOLON,
      reparatur: { von: offset, bis: offset, ersatz: ';' },
    });
  }

  private klammerZuFehlt(auf: Token): void {
    const { pos, offset } = this.hinterVorig();
    const wo = auf.zeile === pos.zeile ? 'in dieser Zeile' : `aus Zeile ${auf.zeile}`;
    this.fehler('klammer-rund-fehlt', pos, `Die runde Klammer \`(\` ${wo} wird nicht wieder geschlossen: Hier fehlt eine \`)\`.`, {
      javac: "')' expected",
      tipp: 'Zähle bei jeder Bedingung und jedem Aufruf nach: Zu jeder ( gehört genau eine ).',
      reparatur: { von: offset, bis: offset, ersatz: ')' },
    });
  }

  private kannAusdruckBeginnen(): boolean {
    const a = this.akt;
    if (a.art === 'zahl' || a.art === 'text' || a.art === 'buchstabe' || a.art === 'bez') return true;
    if (a.art === 'wort') return AUSDRUCK_START_WORTE.has(a.text);
    return a.art === 'zeichen' && AUSDRUCK_START_ZEICHEN.has(a.text);
  }

  private istBinaerOperator(tok: Token): boolean {
    if (tok.art === 'bez') return WORT_ODER.has(tok.text) || WORT_UND.has(tok.text);
    return tok.art === 'zeichen' && EBENEN.some((e) => (e as string[]).includes(tok.text));
  }

  private bedingung(wort: 'if' | 'while'): Ausdruck {
    this.bedingungTiefe++;
    try {
      if (this.ist('(')) {
        const auf = this.nimm();
        if (this.ist(')')) {
          const zu = this.nimm();
          this.fehler('bedingung-fehlt', { ...tokenPos(auf), bis: zu.bis }, `In den runden Klammern nach \`${wort}\` fehlt die Bedingung.`, {
            javac: 'illegal start of expression',
          });
          return this.luecke(zu);
        }
        let b = this.ausdruck();
        if (this.ist(')')) {
          this.nimm();
          if (this.istBinaerOperator(this.akt) && !this.ist('-') && !this.ist('+')) {
            // `if (a) && (b)`: die Bedingung geht hinter der Klammer weiter.
            const op = this.akt;
            this.vorgabe = this.mk<Klammer>(auf, { art: 'Klammer', inhalt: b });
            b = this.ausdruck();
            const ende = this.t[this.p - 1];
            this.fehler(
              'bedingung-klammern',
              tokenPos(op),
              `Die Bedingung nach \`${wort}\` endet schon bei der schließenden Klammer vor \`${op.text}\`. Die ganze Bedingung muss in einem gemeinsamen Klammerpaar stehen.`,
              {
                javac: 'illegal start of expression',
                tipp: `Setze um die gesamte Bedingung ein äußeres Klammerpaar: \`${wort} (… ${op.text} …)\`.`,
                reparatur: { von: auf.von, bis: ende.bis, ersatz: `(${this.quelltext.slice(auf.von, ende.bis)})` },
              },
            );
          }
        } else {
          this.klammerZuFehlt(auf);
        }
        return b;
      }

      if (!this.kannAusdruckBeginnen()) {
        this.fehler('klammer-rund-fehlt', this.hinterVorig().pos, `Nach \`${wort}\` fehlt die Bedingung in runden Klammern: \`${wort} (…)\`.`, {
          javac: "'(' expected",
        });
        return this.luecke(this.akt);
      }
      const startTok = this.akt;
      const b = this.ausdruck();
      const endeTok = this.t[this.p - 1];
      const tipp = 'Die Bedingung von if und while steht immer in runden Klammern – auch wenn sie nur aus einem Methodenaufruf besteht.';
      if (this.ist(')')) {
        this.nimm();
        this.fehler('klammer-rund-fehlt', tokenPos(startTok), `Nach \`${wort}\` fehlt die öffnende runde Klammer \`(\` vor der Bedingung.`, {
          javac: "'(' expected",
          tipp,
          reparatur: { von: startTok.von, bis: startTok.von, ersatz: '(' },
        });
      } else {
        const text = this.quelltext.slice(startTok.von, endeTok.bis);
        this.fehler(
          'klammer-rund-fehlt',
          { ...tokenPos(startTok), bis: endeTok.bis, endZeile: endeTok.zeile },
          `Die Bedingung nach \`${wort}\` muss in runden Klammern stehen: \`${wort} (${this.kurz(startTok.von, endeTok.bis)})\`.`,
          { javac: "'(' expected", tipp, reparatur: { von: startTok.von, bis: endeTok.bis, ersatz: `(${text})` } },
        );
      }
      return b;
    } finally {
      this.bedingungTiefe--;
    }
  }

  private rumpf(wort: RumpfWort, kopf: Token, istDann = false): Anweisung {
    const a = this.akt;
    if (this.ist(';') && wort !== 'do') {
      this.nimm();
      const leer = this.mk<Leer>(a, { art: 'Leer' });
      if (this.ist('{')) {
        const wo = wort === 'else' ? 'Nach `else`' : `Hinter \`${wort} (…)\``;
        const folge: Record<Exclude<RumpfWort, 'do'>, string> = {
          while:
            'Damit endet die Schleife schon hier: Sie wiederholt nur die leere Anweisung `;`. Der Block `{ … }` darunter gehört nicht mehr zur Schleife. Ist die Bedingung am Anfang wahr, ändert sich nie wieder etwas – die Schleife läuft endlos.',
          if: 'Damit endet die if-Anweisung schon hier. Der Block `{ … }` darunter gehört nicht mehr dazu und wird immer ausgeführt – egal, ob die Bedingung stimmt.',
          for: 'Damit endet die Zählschleife schon hier: Sie wiederholt nur die leere Anweisung `;`. Der Block `{ … }` darunter gehört nicht mehr dazu und wird genau einmal ausgeführt.',
          else: 'Damit endet der else-Zweig schon hier. Der Block `{ … }` darunter wird immer ausgeführt.',
        };
        const diagnose = this.warnung(`semikolon-nach-${wort}`, tokenPos(a), `${wo} in Zeile ${kopf.zeile} steht ein Semikolon. ${folge[wort]}`, {
          tipp: TIPP_KEIN_SEMIKOLON,
          reparatur: { von: a.von, bis: a.bis, ersatz: '' },
        });
        if (wort === 'if') this.ifSemikolonBlock = { index: this.p, zeile: kopf.zeile, diagnose };
      }
      return leer;
    }
    if (this.ist('{')) return this.block({ art: 'block', wort, zeile: kopf.zeile, istDann });
    if (this.ist('}') || this.istEnde() || this.istMitgliedBeginn()) {
      this.fehler(
        'rumpf-fehlt',
        this.hinterVorig().pos,
        wort === 'else' || wort === 'do'
          ? `Nach \`${wort}\` fehlt die Anweisung (oder der Block \`{ … }\`), die ausgeführt werden soll.`
          : `Nach \`${wort} (…)\` fehlt die Anweisung (oder der Block \`{ … }\`), die ausgeführt werden soll.`,
        { javac: 'illegal start of statement' },
      );
      return this.luecke(a);
    }
    return this.anweisung() ?? this.luecke(a);
  }

  private wenn(): Wenn {
    const start = this.nimm();
    const bedingung = this.bedingung('if');
    const dann = this.rumpf('if', start, true);
    let sonst: Anweisung | undefined;
    if (this.ist('else')) {
      const elseTok = this.nimm();
      sonst = this.rumpf('else', elseTok);
    }
    return this.mk<Wenn>(start, { art: 'Wenn', bedingung, dann, ...(sonst ? { sonst } : {}) });
  }

  private elseOhneIf(): Anweisung {
    const e = this.nimm();
    const wegenSemikolon = this.elseErklaerung?.index === e.index ? this.elseErklaerung : null;
    if (wegenSemikolon) {
      // Mit einem else dahinter lässt sich das Programm nicht mehr übersetzen: aus der Warnung wird ein Fehler.
      wegenSemikolon.diagnose.schwere = 'fehler';
      wegenSemikolon.diagnose.javac = "'else' without 'if'";
    }
    this.fehler(
      'else-ohne-if',
      tokenPos(e),
      wegenSemikolon
        ? `Dieses \`else\` hat kein \`if\` mehr: Das Semikolon hinter \`if (…)\` in Zeile ${wegenSemikolon.zeile} hat die if-Anweisung schon beendet.`
        : 'Dieses `else` gehört zu keinem `if`. Ein `else` muss direkt auf den Dann-Teil eines `if` folgen – dazwischen darf nichts anderes stehen.',
      {
        javac: "'else' without 'if'",
        tipp: 'Ein `else` steht immer direkt hinter der `}` des zugehörigen if-Blocks. Prüfe, ob davor eine `}` zu viel oder ein Semikolon hinter `if (…)` steht.',
        ...(wegenSemikolon ? { folgefehler: true } : {}),
      },
    );
    this.unsauber = true;
    // Den Zweig trotzdem lesen, damit Fehler darin nicht verloren gehen.
    return this.rumpf('else', e);
  }

  private solange(): Solange {
    const start = this.nimm();
    const bedingung = this.bedingung('while');
    const rumpf = this.rumpf('while', start);
    return this.mk<Solange>(start, { art: 'Solange', bedingung, rumpf });
  }

  private wiederhole(): Wiederhole {
    const start = this.nimm();
    const rumpf = this.rumpf('do', start);
    let bedingung: Ausdruck;
    if (this.ist('while')) {
      this.nimm();
      bedingung = this.bedingung('while');
      if (this.ist(';')) this.nimm();
      else {
        const { pos, offset } = this.hinterVorig();
        this.fehler(
          'semikolon-nach-do-while-fehlt',
          pos,
          `Am Ende der do-while-Schleife fehlt in Zeile ${pos.zeile} das Semikolon hinter \`while (…)\`. Bei der fußgesteuerten Schleife ist die Anweisung erst nach der Bedingung zu Ende.`,
          {
            javac: "';' expected",
            tipp: 'Merke den Unterschied: Bei `while (…) { … }` steht hinter der Bedingung kein Semikolon, bei `do { … } while (…);` schon.',
            reparatur: { von: offset, bis: offset, ersatz: ';' },
          },
        );
      }
    } else {
      this.fehler(
        'do-ohne-while',
        this.hinterVorig().pos,
        `Zu dem \`do\` aus Zeile ${start.zeile} fehlt am Ende die Bedingung: Nach dem Block muss \`while (…);\` stehen.`,
        { javac: "'while' expected", tipp: 'Die fußgesteuerte Schleife hat immer die Form `do { … } while (Bedingung);`.' },
      );
      bedingung = this.luecke(this.akt);
    }
    return this.mk<Wiederhole>(start, { art: 'Wiederhole', rumpf, bedingung });
  }

  private forTrenner(): Token | null {
    if (this.ist(';')) {
      this.nimm();
      return null;
    }
    if (this.ist(',')) return this.nimm();
    if (this.ist(':')) {
      this.nichtUnterstuetzt(tokenPos(this.akt), 'die erweiterte for-Schleife `for (… : …)`.');
      throw new Abbruch();
    }
    const { pos, offset } = this.hinterVorig();
    if (this.ist(')')) {
      this.fehler(
        'for-unvollstaendig',
        pos,
        'Der Kopf einer for-Schleife hat immer drei Teile, getrennt durch genau zwei Semikolons: `for (Start; Bedingung; Schritt)`. Hier fehlt ein Semikolon.',
        { javac: "';' expected", reparatur: { von: offset, bis: offset, ersatz: ';' } },
      );
      return null;
    }
    this.fehler('semikolon-fehlt', pos, `Im Kopf der for-Schleife fehlt in Zeile ${pos.zeile} ein Semikolon \`;\` zwischen den drei Teilen.`, {
      javac: "';' expected",
      tipp: 'Der Kopf der Zählschleife lautet immer `for (Start; Bedingung; Schritt)` – mit genau zwei Semikolons.',
      reparatur: { von: offset, bis: offset, ersatz: ';' },
    });
    return null;
  }

  private zaehl(): Zaehl {
    const start = this.nimm();
    let auf: Token | null = null;
    if (this.ist('(')) auf = this.nimm();
    else {
      const { pos, offset } = this.hinterVorig();
      this.fehler('klammer-rund-fehlt', pos, 'Nach `for` fehlt die öffnende runde Klammer `(`.', {
        javac: "'(' expected",
        reparatur: { von: offset, bis: offset, ersatz: ' (' },
      });
    }

    let init: VarDekl | Einfach | undefined;
    if (!this.ist(';') && !this.ist(',') && !this.ist(')')) {
      const initStart = this.akt;
      if (this.istTyp()) init = this.varDekl(this.nimm().text as WertTyp, initStart, true);
      else if (this.akt.art === 'bez') init = this.einfach();
      else if (this.ist('++') || this.ist('--')) init = this.inkrementPraefix();
      else {
        this.unerwartet(this.akt);
        throw new Abbruch();
      }
    }
    const k1 = this.forTrenner();

    let bedingung: Ausdruck | undefined;
    if (!this.ist(';') && !this.ist(',') && !this.ist(')')) {
      this.bedingungTiefe++;
      try {
        bedingung = this.ausdruck();
      } finally {
        this.bedingungTiefe--;
      }
    }
    const k2 = this.forTrenner();

    let schritt: Einfach | undefined;
    if (!this.ist(')') && !this.ist('{')) {
      if (this.akt.art === 'bez') schritt = this.einfach();
      else if (this.ist('++') || this.ist('--')) schritt = this.inkrementPraefix();
      else {
        this.unerwartet(this.akt);
        throw new Abbruch();
      }
    }

    if (k1 || k2) {
      const erster = (k1 ?? k2)!;
      const reparatur =
        k1 && k2
          ? { von: k1.von, bis: k2.bis, ersatz: `;${this.quelltext.slice(k1.bis, k2.von)};` }
          : { von: erster.von, bis: erster.bis, ersatz: ';' };
      this.fehler(
        'for-kommas',
        tokenPos(erster),
        'Im Kopf der for-Schleife werden die drei Teile mit Semikolons getrennt, nicht mit Kommas: `for (int i = 0; i < 5; i++)`.',
        {
          javac: "';' expected",
          tipp: 'Der Kopf der Zählschleife lautet immer `for (Start; Bedingung; Schritt)` – mit genau zwei Semikolons.',
          reparatur,
        },
      );
    }

    if (this.ist(')')) this.nimm();
    else if (auf) this.klammerZuFehlt(auf);
    const rumpf = this.rumpf('for', start);
    return this.mk<Zaehl>(start, {
      art: 'Zaehl',
      ...(init ? { init } : {}),
      ...(bedingung ? { bedingung } : {}),
      ...(schritt ? { schritt } : {}),
      rumpf,
    });
  }

  private rueckgabe(): Rueckgabe {
    const start = this.nimm();
    if (this.ist(';')) {
      this.nimm();
      return this.mk<Rueckgabe>(start, { art: 'Rueckgabe' });
    }
    const ohneWert =
      this.ist('}') || this.istEnde() || (this.methodenKontext?.rueckgabe === 'void' && this.akt.zeile > start.zeile);
    if (ohneWert) {
      this.semikolon(start);
      return this.mk<Rueckgabe>(start, { art: 'Rueckgabe' });
    }
    const wert = this.ausdruck();
    this.semikolon(start);
    return this.mk<Rueckgabe>(start, { art: 'Rueckgabe', wert });
  }

  private varDekl(typ: WertTyp, start: Token, imForKopf: boolean): VarDekl {
    if (this.ist('[')) {
      this.nichtUnterstuetzt(tokenPos(this.akt), 'Arrays (Felder mit eckigen Klammern).');
      throw new Abbruch();
    }
    if (this.akt.art !== 'bez') {
      this.fehler('bezeichner-erwartet', this.hinterVorig().pos, `Nach dem Typ \`${typ}\` fehlt der Name der Variablen, z.B. \`${typ} anzahl\`.`, {
        javac: 'not a statement',
      });
      throw new Abbruch();
    }
    const nameTok = this.nimm();
    if (this.ist('[')) {
      this.nichtUnterstuetzt(tokenPos(this.akt), 'Arrays (Felder mit eckigen Klammern).');
      throw new Abbruch();
    }
    let wert: Ausdruck | undefined;
    if (this.ist('=')) {
      this.nimm();
      wert = this.ausdruck();
    } else if (this.ist('==')) {
      this.meldeVergleichStattZuweisung(this.akt);
      this.nimm();
      wert = this.ausdruck();
    }
    if (!imForKopf && this.ist(',')) {
      this.nichtUnterstuetzt(
        tokenPos(this.akt),
        'mehrere Variablen in einer Deklaration (`int a, b;`).',
        'Schreibe für jede Variable eine eigene Zeile.',
      );
      throw new Abbruch();
    }
    return this.mk<VarDekl>(start, { art: 'VarDekl', typ, name: nameTok.text, ...(wert ? { wert } : {}) });
  }

  private meldeVergleichStattZuweisung(op: Token): void {
    this.fehler(
      'vergleich-statt-zuweisung',
      tokenPos(op),
      'Mit `==` wird nur verglichen. Um einer Variablen einen Wert zu geben, brauchst du ein einzelnes `=`.',
      {
        javac: 'not a statement',
        tipp: 'Ein Gleichheitszeichen `=` weist zu (Wert speichern), zwei `==` vergleichen (Frage stellen).',
        reparatur: { von: op.von, bis: op.bis, ersatz: '=' },
      },
    );
  }

  private istMethodenname(name: string): boolean {
    return this.bekannteMethoden.has(name) || aehnliche(name, this.bekannteMethoden) !== null;
  }

  private inkrementPraefix(): Inkrement {
    const op = this.nimm();
    if (this.akt.art !== 'bez') {
      this.fehler('bezeichner-erwartet', this.hinterVorig().pos, `Nach \`${op.text}\` fehlt der Name der Variablen, z.B. \`${op.text}i\`.`, {
        javac: 'illegal start of expression',
      });
      throw new Abbruch();
    }
    const nameTok = this.nimm();
    return this.mk<Inkrement>(op, { art: 'Inkrement', name: nameTok.text, op: op.text as '++' | '--', praefix: true });
  }

  private aufrufOhneKlammern(a: Token): AufrufAnw {
    this.nimm();
    this.fehler(
      'klammer-rund-fehlt',
      tokenPos(a),
      `Nach dem Methodennamen \`${a.text}\` fehlen die runden Klammern. Ein Aufruf sieht immer so aus: \`${a.text}();\``,
      {
        javac: 'not a statement',
        tipp: 'Hinter jedem Methodennamen stehen runde Klammern – auch wenn nichts darin steht.',
        reparatur: { von: a.bis, bis: a.bis, ersatz: '()' },
      },
    );
    const aufruf = this.mk<Aufruf>(a, { art: 'Aufruf', name: a.text, argumente: [], mitThis: false, namePos: tokenPos(a) });
    return this.mk<AufrufAnw>(a, { art: 'AufrufAnw', aufruf });
  }

  private einfach(): Einfach {
    const a = this.akt;
    const n = this.vor(1);
    if (n.art === 'zeichen') {
      switch (n.text) {
        case '(': {
          const aufruf = this.aufruf(null);
          return this.mk<AufrufAnw>(a, { art: 'AufrufAnw', aufruf });
        }
        case '=':
        case '+=':
        case '-=': {
          this.nimm();
          this.nimm();
          const wert = this.ausdruck();
          return this.mk<Zuweisung>(a, { art: 'Zuweisung', name: a.text, op: n.text as '=' | '+=' | '-=', wert });
        }
        case '==': {
          this.nimm();
          this.meldeVergleichStattZuweisung(this.nimm());
          const wert = this.ausdruck();
          return this.mk<Zuweisung>(a, { art: 'Zuweisung', name: a.text, op: '=', wert });
        }
        case '++':
        case '--':
          this.nimm();
          this.nimm();
          return this.mk<Inkrement>(a, { art: 'Inkrement', name: a.text, op: n.text as '++' | '--', praefix: false });
        case '*=':
        case '/=':
        case '%=':
          this.nichtUnterstuetzt(
            tokenPos(n),
            `die Kurzschreibweise \`${n.text}\`.`,
            `Schreibe die Rechnung aus, z.B. \`${a.text} = ${a.text} ${n.text[0]} 2;\`.`,
          );
          throw new Abbruch();
        case '.':
          this.nichtUnterstuetzt(
            tokenPos(a),
            a.text === 'System'
              ? 'Ausgaben mit `System.out.println(...)`.'
              : `Aufrufe mit Punkt wie \`${a.text}.…\`. In der App gibt es nur die Spinne selbst – ihre Methoden rufst du direkt auf, z.B. \`schritt();\`.`,
          );
          throw new Abbruch();
        case '[':
          this.nichtUnterstuetzt(tokenPos(n), 'Arrays (Felder mit eckigen Klammern).');
          throw new Abbruch();
        default:
          break;
      }
    }
    if (this.istMethodenname(a.text) && !this.istBinaerOperator(n)) return this.aufrufOhneKlammern(a);
    if (this.istBinaerOperator(n)) {
      this.fehler(
        'keine-anweisung',
        tokenPos(a),
        `Hier steht nur ein Ausdruck (\`${a.text} ${n.text} …\`), aber keine Anweisung: Das Ergebnis wird nirgends verwendet.`,
        { javac: 'not a statement' },
      );
    } else {
      this.fehler(
        'keine-anweisung',
        tokenPos(a),
        `\`${a.text}\` allein ist keine vollständige Anweisung. Soll eine Methode aufgerufen werden, fehlen die runden Klammern (\`${a.text}();\`); soll eine Variable einen Wert bekommen, fehlt \`= …\`.`,
        { javac: 'not a statement' },
      );
    }
    throw new Abbruch();
  }

  private einfachMitThis(): Einfach {
    const start = this.nimm();
    if (!this.ist('.') || this.vor(1).art !== 'bez') {
      this.nichtUnterstuetzt(tokenPos(start), '`this` ohne `.name` dahinter.');
      throw new Abbruch();
    }
    this.nimm();
    const nameTok = this.akt;
    const n = this.vor(1);
    if (this.ist('(', n)) {
      const aufruf = this.aufruf(start);
      return this.mk<AufrufAnw>(start, { art: 'AufrufAnw', aufruf });
    }
    if (this.ist('=', n) || this.ist('+=', n) || this.ist('-=', n)) {
      this.nimm();
      const op = this.nimm().text as '=' | '+=' | '-=';
      const wert = this.ausdruck();
      return this.mk<Zuweisung>(start, { art: 'Zuweisung', name: nameTok.text, op, wert, mitThis: true });
    }
    this.nichtUnterstuetzt(tokenPos(start), `\`this.${nameTok.text}\` an dieser Stelle.`);
    throw new Abbruch();
  }

  // ---------- Ausdrücke ----------

  private ausdruck(): Ausdruck {
    const a = this.binaer(0);
    const n = this.akt;
    if (n.art === 'zeichen' && ['?', '^', '<<', '>>', '>>>'].includes(n.text)) {
      this.nichtUnterstuetzt(
        tokenPos(n),
        n.text === '?' ? 'den Bedingungsoperator `? :`.' : `den Operator \`${n.text}\`.`,
        n.text === '?' ? 'Nimm stattdessen `if` und `else`.' : undefined,
      );
      throw new Abbruch();
    }
    if (n.art === 'wort' && n.text === 'instanceof') {
      this.nichtUnterstuetzt(tokenPos(n), '`instanceof`.');
      throw new Abbruch();
    }
    return a;
  }

  private binaer(ebene: number): Ausdruck {
    if (ebene === EBENEN.length) return this.unaer();
    const start = this.vorgabe ? this.t[this.vorgabeStart()] : this.akt;
    let links = this.binaer(ebene + 1);
    for (;;) {
      const op = this.operatorAuf(ebene);
      if (!op) break;
      const rechts = this.binaer(ebene + 1);
      links = this.mk<Binaer>(start, { art: 'Binaer', op, links, rechts });
    }
    return links;
  }

  private vorgabeStart(): number {
    const von = this.vorgabe!.pos.von;
    let i = this.p;
    while (i > 0 && this.t[i].von > von) i--;
    return i;
  }

  /** Verbraucht einen Operator der angegebenen Vorrangstufe, falls einer ansteht (inklusive typischer Verschreiber). */
  private operatorAuf(ebene: number): BinaerOp | null {
    const a = this.akt;
    if (a.art === 'bez') {
      const istOder = ebene === 0 && WORT_ODER.has(a.text);
      const istUnd = ebene === 1 && WORT_UND.has(a.text);
      if (!istOder && !istUnd) return null;
      const ersatz = istOder ? '||' : '&&';
      this.fehler('wort-statt-operator', tokenPos(a), `In Java schreibt man \`${ersatz}\` statt \`${a.text}\`.`, {
        javac: "')' expected",
        tipp: 'Die Verknüpfungen heißen in Java `&&` (und), `||` (oder) und `!` (nicht).',
        reparatur: { von: a.von, bis: a.bis, ersatz },
      });
      this.nimm();
      return ersatz;
    }
    if (a.art !== 'zeichen') return null;

    if (ebene === 5 && a.text === '=') {
      const n = this.vor(1);
      if ((this.ist('<', n) || this.ist('>', n)) && n.von === a.bis) {
        const richtig = (n.text + '=') as BinaerOp;
        this.fehler('vergleich-verdreht', { ...tokenPos(a), bis: n.bis }, `\`=${n.text}\` gibt es in Java nicht – das Gleichheitszeichen steht hinten: \`${richtig}\`.`, {
          javac: 'illegal start of expression',
          tipp: 'Sprich es dir vor: „kleiner gleich“ → erst `<`, dann `=`.',
          reparatur: { von: a.von, bis: n.bis, ersatz: richtig },
        });
        this.nimm();
        this.nimm();
        return richtig;
      }
      return null;
    }

    if (ebene === 4 && a.text === '=') {
      if (this.bedingungTiefe === 0) {
        this.nichtUnterstuetzt(tokenPos(a), 'eine Zuweisung mitten in einem Ausdruck (`a = b = …`).', 'Schreibe jede Zuweisung als eigene Anweisung.');
        throw new Abbruch();
      }
      this.fehler(
        'zuweisung-statt-vergleich',
        tokenPos(a),
        'In der Bedingung steht ein einzelnes `=`. Das ist eine Zuweisung (Wert speichern) – zum Vergleichen brauchst du `==`.',
        {
          javac: 'incompatible types: int cannot be converted to boolean',
          tipp: 'Ein Gleichheitszeichen `=` weist zu, zwei `==` vergleichen. In Bedingungen steht immer `==`.',
          reparatur: { von: a.von, bis: a.bis, ersatz: '==' },
        },
      );
      this.nimm();
      return '==';
    }

    if (!(EBENEN[ebene] as string[]).includes(a.text)) return null;
    if (a.text === '&' || a.text === '|') {
      const doppelt = a.text + a.text;
      this.warnung(
        'und-oder-einfach',
        tokenPos(a),
        `Hier steht ein einzelnes \`${a.text}\`. Für „${a.text === '&' ? 'und' : 'oder'}“ in Bedingungen schreibt man \`${doppelt}\`. Mit einem einzelnen \`${a.text}\` wertet Java immer beide Seiten aus, auch wenn das Ergebnis schon feststeht.`,
        {
          tipp: 'Die Verknüpfungen heißen in Java `&&` (und), `||` (oder) und `!` (nicht) – immer mit zwei Zeichen.',
          reparatur: { von: a.von, bis: a.bis, ersatz: doppelt },
        },
      );
    }
    this.nimm();
    return a.text as BinaerOp;
  }

  private unaer(): Ausdruck {
    if (this.vorgabe) {
      const v = this.vorgabe;
      this.vorgabe = null;
      return v;
    }
    const a = this.akt;
    if (this.ist('!')) {
      this.nimm();
      const operand = this.unaer();
      return this.mk<Unaer>(a, { art: 'Unaer', op: '!', operand });
    }
    if (this.ist('-')) {
      this.nimm();
      if (this.akt.art === 'zahl' && this.akt.text === '2147483648') {
        this.nimm();
        return this.mk<Zahl>(a, { art: 'Zahl', wert: -2147483648 });
      }
      const operand = this.unaer();
      return this.mk<Unaer>(a, { art: 'Unaer', op: '-', operand });
    }
    if (a.art === 'bez' && WORT_NICHT.has(a.text) && !this.ist('(', this.vor(1)) && (this.vor(1).art === 'bez' || this.ist('!', this.vor(1)))) {
      this.fehler('wort-statt-operator', tokenPos(a), `In Java schreibt man \`!\` statt \`${a.text}\`.`, {
        javac: "')' expected",
        tipp: 'Die Verknüpfungen heißen in Java `&&` (und), `||` (oder) und `!` (nicht).',
        reparatur: { von: a.von, bis: this.vor(1).von, ersatz: '!' },
      });
      this.nimm();
      const operand = this.unaer();
      return this.mk<Unaer>(a, { art: 'Unaer', op: '!', operand });
    }
    if (this.ist('++') || this.ist('--')) {
      this.nichtUnterstuetzt(tokenPos(a), `\`${a.text}\` mitten in einem Ausdruck.`, 'Schreibe das Hoch- oder Herunterzählen als eigene Anweisung, z.B. `i++;`.');
      throw new Abbruch();
    }
    if (this.ist('+') || this.ist('~')) {
      this.nichtUnterstuetzt(tokenPos(a), `das Vorzeichen \`${a.text}\` vor einem Wert.`);
      throw new Abbruch();
    }
    return this.primaer();
  }

  private zahl(): Ausdruck {
    const a = this.nimm();
    if (/^0\d+$/.test(a.text)) {
      // Java liest `010` als Oktalzahl 8 – lieber gar nicht ausführen als falsch rechnen.
      this.nichtUnterstuetzt(tokenPos(a), `Zahlen mit führender Null wie \`${a.text}\` (Java liest sie als Oktalzahl).`, 'Lass die Null am Anfang weg.');
      return this.luecke(a);
    }
    if (/^\d+$/.test(a.text)) {
      const wert = Number(a.text);
      if (wert > 2147483647) {
        this.fehler('zahl-zu-gross', tokenPos(a), `Die Zahl ${a.text} ist zu groß für den Typ \`int\`. Die größte int-Zahl ist 2147483647.`, {
          javac: 'integer number too large',
        });
        return this.luecke(a);
      }
      return this.mk<Zahl>(a, { art: 'Zahl', wert });
    }
    if (/^\d+\.\d+[fFdD]?$/.test(a.text)) {
      this.nichtUnterstuetzt(tokenPos(a), `Kommazahlen wie \`${a.text}\`. Die App rechnet nur mit ganzen Zahlen (\`int\`).`);
      return this.luecke(a);
    }
    if (/^(\d+[lLfFdD]|0[xXbB][0-9a-fA-F]+)$/.test(a.text)) {
      this.nichtUnterstuetzt(tokenPos(a), `die Zahlschreibweise \`${a.text}\`. Schreibe ganze Zahlen einfach als Ziffern.`);
      return this.luecke(a);
    }
    this.fehler('zahl-ungueltig', tokenPos(a), `\`${a.text}\` ist weder eine Zahl noch ein gültiger Name. Namen dürfen nicht mit einer Ziffer beginnen.`, {
      tipp: 'Namen beginnen mit einem Buchstaben; Ziffern dürfen erst danach kommen (z.B. `schritt2`).',
    });
    return this.luecke(a);
  }

  /** Prüft, was direkt hinter einem Namen oder Aufruf steht, das die App nicht kann. */
  private nachPrimaer(k: Ausdruck, letzter: Token): Ausdruck {
    const n = this.akt;
    if (this.ist('.')) {
      this.nichtUnterstuetzt(tokenPos(n), 'Zugriffe mit Punkt (`objekt.methode()`). In der App gibt es nur die Spinne selbst.');
      throw new Abbruch();
    }
    if (this.ist('[')) {
      this.nichtUnterstuetzt(tokenPos(n), 'Arrays (Felder mit eckigen Klammern).');
      throw new Abbruch();
    }
    if ((this.ist('++') || this.ist('--')) && n.zeile === letzter.zeile) {
      this.nichtUnterstuetzt(tokenPos(n), `\`${n.text}\` mitten in einem Ausdruck.`, 'Schreibe das Hoch- oder Herunterzählen als eigene Anweisung, z.B. `i++;`.');
      throw new Abbruch();
    }
    return k;
  }

  private primaer(): Ausdruck {
    const a = this.akt;
    switch (a.art) {
      case 'zahl':
        return this.zahl();
      case 'text':
        this.nimm();
        this.nichtUnterstuetzt(tokenPos(a), 'Texte in Anführungszeichen (Strings). Die App kennt nur ganze Zahlen und Wahrheitswerte.');
        return this.luecke(a);
      case 'buchstabe':
        this.nimm();
        this.nichtUnterstuetzt(tokenPos(a), 'einzelne Zeichen in Hochkommas (`char`).');
        return this.luecke(a);
      case 'bez': {
        if (this.ist('(', this.vor(1))) {
          const aufruf = this.aufruf(null);
          return this.nachPrimaer(aufruf, this.t[this.p - 1]);
        }
        this.nimm();
        const v = this.mk<Var>(a, { art: 'Var', name: a.text });
        return this.nachPrimaer(v, a);
      }
      case 'wort':
        if (a.text === 'true' || a.text === 'false') {
          this.nimm();
          return this.mk<Wahrheit>(a, { art: 'Wahrheit', wert: a.text === 'true' });
        }
        if (a.text === 'this') {
          this.nimm();
          if (!this.ist('.') || this.vor(1).art !== 'bez') {
            this.nichtUnterstuetzt(tokenPos(a), '`this` ohne `.name` dahinter.');
            throw new Abbruch();
          }
          this.nimm();
          if (this.ist('(', this.vor(1))) {
            const aufruf = this.aufruf(a);
            return this.nachPrimaer(aufruf, this.t[this.p - 1]);
          }
          const nameTok = this.nimm();
          const v = this.mk<Var>(a, { art: 'Var', name: nameTok.text, mitThis: true });
          return this.nachPrimaer(v, nameTok);
        }
        if (a.text === 'new') {
          this.nichtUnterstuetzt(tokenPos(a), 'das Erzeugen von Objekten mit `new`.');
          throw new Abbruch();
        }
        if (a.text === 'null') {
          this.nimm();
          this.nichtUnterstuetzt(tokenPos(a), '`null`.');
          return this.luecke(a);
        }
        if (a.text === 'super') {
          this.nichtUnterstuetzt(tokenPos(a), 'Aufrufe mit `super`.');
          throw new Abbruch();
        }
        break;
      case 'zeichen':
        if (a.text === '(') {
          this.nimm();
          if (this.akt.art === 'wort' && (this.istTyp() || FREMDE_TYPEN.has(this.akt.text)) && this.ist(')', this.vor(1))) {
            this.nichtUnterstuetzt(tokenPos(this.akt), `Typumwandlungen wie \`(${this.akt.text})\`.`);
            throw new Abbruch();
          }
          if (this.ist(')')) {
            const zu = this.nimm();
            this.fehler('ausdruck-erwartet', { ...tokenPos(a), bis: zu.bis }, 'Zwischen diesen runden Klammern fehlt ein Wert oder eine Bedingung.', {
              javac: 'illegal start of expression',
            });
            return this.luecke(zu);
          }
          const inhalt = this.ausdruck();
          if (this.ist(')')) this.nimm();
          else this.klammerZuFehlt(a);
          return this.mk<Klammer>(a, { art: 'Klammer', inhalt });
        }
        break;
      default:
        break;
    }

    const voriges = this.p > 0 ? this.t[this.p - 1] : null;
    const fehltEtwas = a.art === 'ende' || (a.art === 'zeichen' && [';', ')', '}', '{', ','].includes(a.text));
    const pos = fehltEtwas ? this.hinterVorig().pos : tokenPos(a);
    const nach = voriges && voriges.art === 'zeichen' ? `Nach \`${voriges.text}\` fehlt` : 'Hier fehlt';
    this.fehler(
      'ausdruck-erwartet',
      pos,
      fehltEtwas
        ? `${nach} ein Wert, z.B. eine Zahl, eine Variable oder ein Methodenaufruf.`
        : `An dieser Stelle erwartet Java einen Wert (Zahl, Variable oder Methodenaufruf), aber hier steht \`${a.text}\`.`,
      { javac: 'illegal start of expression' },
    );
    return this.luecke(a);
  }

  private aufruf(thisTok: Token | null): Aufruf {
    const nameTok = this.nimm();
    const auf = this.nimm();
    const argumente: Ausdruck[] = [];
    if (!this.ist(')')) {
      for (;;) {
        if (!this.kannAusdruckBeginnen()) {
          if (argumente.length > 0) {
            this.fehler('ausdruck-erwartet', this.hinterVorig().pos, 'Nach dem Komma fehlt ein weiteres Argument.', {
              javac: 'illegal start of expression',
            });
            this.unsauber = true;
          }
          break;
        }
        argumente.push(this.ausdruck());
        if (this.ist(',')) {
          this.nimm();
          continue;
        }
        break;
      }
    }
    if (this.ist(')')) this.nimm();
    else this.klammerZuFehlt(auf);
    return this.mk<Aufruf>(thisTok ?? nameTok, {
      art: 'Aufruf',
      name: nameTok.text,
      argumente,
      mitThis: thisTok !== null,
      namePos: tokenPos(nameTok),
    });
  }
}
