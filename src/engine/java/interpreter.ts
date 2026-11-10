// Rekursiver Auswerter für geprüfte Programme. Jeder Schritt wird als Ereignis mit einem
// unveränderlichen Schnappschuss (Welt, Variablen) festgehalten, damit man vor- und zurückblättern kann.

import { aktion, sensor, weltHash, type Welt } from '../welt';
import type {
  Anweisung,
  Aufruf,
  AufrufAnw,
  Ausdruck,
  Binaer,
  Knoten,
  Konstruktor,
  Methode,
  Programm,
  Solange,
  Typ,
  Var,
  VarDekl,
  WertTyp,
  Wiederhole,
  Zaehl,
} from './ast';
import { findeEingebaut } from './builtins';

export type Wert = number | boolean;

export type Ereignis =
  | { art: 'anweisung'; knoten: number }
  | { art: 'bedingung'; knoten: number; wert: boolean; teile: { knoten: number; text: string; wert: Wert }[] }
  | { art: 'aktion'; knoten: number; name: string; ok: boolean; meldung?: string }
  | { art: 'aufruf'; knoten: number; methode: string; args: Wert[] }
  | { art: 'rueckkehr'; knoten: number; methode: string; wert?: Wert }
  | { art: 'variable'; knoten: number; name: string; wert: Wert; neu: boolean }
  | { art: 'ende'; grund: 'fertig' | 'schrittlimit' | 'endlosschleife' | 'stapelueberlauf' | 'laufzeitfehler'; text?: string };

export interface Variable {
  name: string;
  typ: Typ;
  wert: Wert;
}

export interface Rahmen {
  methode: string;
  variablen: Variable[];
}

export interface Schritt {
  nr: number;
  ereignis: Ereignis;
  /** Zeile des gerade ausgeführten Knotens im Originalquelltext. */
  zeile: number;
  /** Aufruftiefe: 0 = außerhalb, 1 = in der gestarteten Methode, 2 = in einer von dort aufgerufenen … */
  tiefe: number;
  /** Zustand NACH dem Ereignis. */
  welt: Welt;
  rahmen: readonly Rahmen[];
  /** Attribute der Klasse (leer, wenn es keine gibt). */
  attribute: readonly Variable[];
  konsoleLaenge: number;
}

type EndeEreignis = Extract<Ereignis, { art: 'ende' }>;

export interface Lauf {
  /** Leer, wenn aufzeichnen === false. */
  schritte: Schritt[];
  konsole: string[];
  endwelt: Welt;
  rueckgabe?: Wert;
  ende: EndeEreignis;
  /** Anzahl der Aufrufe je eingebauter void-Methode, z.B. { schritt: 7, linksDrehen: 2 } – auch wirkungslose zählen mit. */
  zaehler: Record<string, number>;
}

export interface MethodenInfo {
  name: string;
  parameter: { name: string; typ: Typ }[];
  rueckgabe: Typ;
}

const MAX_TIEFE = 500;
const LIMIT_MIT_AUFZEICHNUNG = 20_000;
const LIMIT_OHNE_AUFZEICHNUNG = 200_000;
const KEINE_ATTRIBUTE: readonly Variable[] = Object.freeze([]);

/** Bricht den Lauf ab; getragen wird nur das Ende-Ereignis. `return` läuft dagegen über Rückgabewerte. */
class Abbruch {
  constructor(readonly ende: EndeEreignis) {}
}

/** null = normal weiter, sonst hat ein `return` die Methode beendet. */
type Abschluss = null | { wert: Wert | undefined };
const RUECK_OHNE_WERT: Abschluss = { wert: undefined };

interface LaufRahmen {
  methode: string;
  namen: string[];
  typen: WertTyp[];
  werte: Wert[];
  belegt: boolean[];
  schnapp: Rahmen | null;
  /** Je Schleife dieser Aktivierung: Anzahl der Bedingungsprüfungen und Schrittzähler der letzten. */
  schleifen: Map<number, { n: number; schritt: number }> | null;
  /** Schon gesehene Zustände an Schleifenbedingungen → Nummer der Prüfung. */
  gesehen: Map<string, number> | null;
}

type Schleife = Solange | Wiederhole | Zaehl;

class Ausfuehrung {
  private welt: Welt;
  private readonly konsole: string[] = [];
  private readonly schritte: Schritt[] = [];
  private readonly zaehler: Record<string, number> = {};
  private readonly rec: boolean;
  private auf: boolean;
  private readonly max: number;
  private anzahl = 0;
  private letzteZeile = 1;

  private readonly stapel: LaufRahmen[] = [];
  private rahmen!: LaufRahmen;
  private stapelSchnapp: readonly Rahmen[] | null = null;

  private readonly attrNamen: string[] = [];
  private readonly attrTypen: WertTyp[] = [];
  private readonly attrWerte: Wert[] = [];
  private attrSchnapp: readonly Variable[] | null = null;

  private readonly eigene = new Map<string, Methode[]>();
  private readonly texte = new Map<number, string>();
  private teile: { knoten: number; text: string; wert: Wert }[] | null = null;

  private readonly weltNummern = new Map<string, number>();
  private letzteWelt: Welt | null = null;
  private letzteWeltNr = 0;
  private fehlaktion: { name: string; meldung?: string; schritt: number } | null = null;

  constructor(
    private readonly programm: Programm,
    start: Welt,
    opt?: { maxSchritte?: number; aufzeichnen?: boolean },
  ) {
    this.welt = start;
    this.rec = opt?.aufzeichnen !== false;
    this.auf = this.rec;
    this.max = opt?.maxSchritte ?? (this.rec ? LIMIT_MIT_AUFZEICHNUNG : LIMIT_OHNE_AUFZEICHNUNG);
    for (const m of programm.klasse.methoden) {
      const liste = this.eigene.get(m.name);
      if (liste) liste.push(m);
      else this.eigene.set(m.name, [m]);
    }
  }

  // ---------- Schritte und Schnappschüsse ----------

  private rahmenSchnapp(): readonly Rahmen[] {
    if (!this.stapelSchnapp) {
      this.stapelSchnapp = this.stapel.map((r) => {
        if (!r.schnapp) {
          const variablen: Variable[] = [];
          for (let i = 0; i < r.namen.length; i++) {
            if (r.belegt[i]) variablen.push({ name: r.namen[i], typ: r.typen[i], wert: r.werte[i] });
          }
          r.schnapp = { methode: r.methode, variablen };
        }
        return r.schnapp;
      });
    }
    return this.stapelSchnapp;
  }

  private attributSchnapp(): readonly Variable[] {
    if (this.attrNamen.length === 0) return KEINE_ATTRIBUTE;
    if (!this.attrSchnapp) {
      this.attrSchnapp = this.attrNamen.map((name, i) => ({ name, typ: this.attrTypen[i], wert: this.attrWerte[i] }));
    }
    return this.attrSchnapp;
  }

  /** Zählt einen Schritt und zeichnet ihn auf. Aufrufer übergeben null, wenn nicht aufgezeichnet wird. */
  private melde(zeile: number, ereignis: Ereignis | null): void {
    if (++this.anzahl > this.max) {
      throw new Abbruch({
        art: 'ende',
        grund: 'schrittlimit',
        text: `Nach ${this.max} Schritten abgebrochen: Das Programm läuft sehr wahrscheinlich endlos. Beweisen konnte die App es nicht, weil sich bei jedem Durchlauf noch etwas ändert (z.B. eine Variable, die immer weiterzählt).`,
      });
    }
    this.letzteZeile = zeile;
    if (ereignis) this.zeichneAuf(ereignis, zeile);
  }

  private zeichneAuf(ereignis: Ereignis, zeile: number): void {
    this.schritte.push({
      nr: this.schritte.length,
      ereignis,
      zeile,
      tiefe: this.stapel.length,
      welt: this.welt,
      rahmen: this.rahmenSchnapp(),
      attribute: this.attributSchnapp(),
      konsoleLaenge: this.konsole.length,
    });
  }

  private text(k: Knoten): string {
    let t = this.texte.get(k.id);
    if (t === undefined) {
      t = this.programm.quelltext.slice(k.pos.von, k.pos.bis).replace(/\s+/g, ' ').trim();
      this.texte.set(k.id, t);
    }
    return t;
  }

  private fehler(text: string, k: Knoten): Abbruch {
    this.letzteZeile = k.pos.zeile;
    return new Abbruch({ art: 'ende', grund: 'laufzeitfehler', text });
  }

  // ---------- Variablen ----------

  private neuerRahmen(methode: string, namen: string[], typen: WertTyp[], werte: Wert[]): LaufRahmen {
    const r: LaufRahmen = { methode, namen, typen, werte, belegt: werte.map(() => true), schnapp: null, schleifen: null, gesehen: null };
    this.stapel.push(r);
    this.rahmen = r;
    this.stapelSchnapp = null;
    return r;
  }

  private verlasseRahmen(): void {
    this.stapel.pop();
    this.rahmen = this.stapel[this.stapel.length - 1];
    this.stapelSchnapp = null;
  }

  private lies(name: string, mitThis: boolean, k: Knoten): Wert {
    if (!mitThis) {
      const r = this.rahmen;
      for (let i = r.namen.length - 1; i >= 0; i--) if (r.namen[i] === name) return r.werte[i];
    }
    const j = this.attrNamen.indexOf(name);
    if (j >= 0) return this.attrWerte[j];
    throw this.fehler(`Die Variable \`${name}\` gibt es an dieser Stelle nicht.`, k);
  }

  private schreibe(name: string, mitThis: boolean, wert: Wert, k: Knoten): void {
    const passt = (typ: WertTyp): boolean => (typ === 'int') === (typeof wert === 'number');
    if (!mitThis) {
      const r = this.rahmen;
      for (let i = r.namen.length - 1; i >= 0; i--) {
        if (r.namen[i] !== name) continue;
        if (!passt(r.typen[i])) throw this.fehler(`Der Wert ${wert} passt nicht zum Typ \`${r.typen[i]}\` der Variablen \`${name}\`.`, k);
        const neu = !r.belegt[i];
        r.werte[i] = wert;
        r.belegt[i] = true;
        r.schnapp = null;
        this.stapelSchnapp = null;
        this.melde(k.pos.zeile, this.auf ? { art: 'variable', knoten: k.id, name, wert, neu } : null);
        return;
      }
    }
    const j = this.attrNamen.indexOf(name);
    if (j < 0) throw this.fehler(`Die Variable \`${name}\` gibt es an dieser Stelle nicht.`, k);
    if (!passt(this.attrTypen[j])) throw this.fehler(`Der Wert ${wert} passt nicht zum Typ \`${this.attrTypen[j]}\` des Attributs \`${name}\`.`, k);
    this.attrWerte[j] = wert;
    this.attrSchnapp = null;
    this.melde(k.pos.zeile, this.auf ? { art: 'variable', knoten: k.id, name, wert, neu: false } : null);
  }

  private deklariere(a: VarDekl): void {
    // Erst den Anfangswert berechnen: Im eigenen Initialisierer ist die neue Variable noch nicht benutzbar.
    const wert = a.wert ? this.werte(a.wert) : undefined;
    const r = this.rahmen;
    r.namen.push(a.name);
    r.typen.push(a.typ);
    r.werte.push(wert ?? (a.typ === 'int' ? 0 : false));
    r.belegt.push(wert !== undefined);
    if (wert === undefined) {
      // Ohne Startwert taucht die Variable erst bei der ersten Zuweisung in den Schnappschüssen auf.
      this.melde(a.pos.zeile, this.auf ? { art: 'anweisung', knoten: a.id } : null);
      return;
    }
    if ((a.typ === 'int') !== (typeof wert === 'number')) throw this.fehler(`Der Wert ${wert} passt nicht zum Typ \`${a.typ}\` der Variablen \`${a.name}\`.`, a);
    r.schnapp = null;
    this.stapelSchnapp = null;
    this.melde(a.pos.zeile, this.auf ? { art: 'variable', knoten: a.id, name: a.name, wert, neu: true } : null);
  }

  private kuerze(r: LaufRahmen, marke: number): void {
    if (r.namen.length === marke) return;
    r.namen.length = marke;
    r.typen.length = marke;
    r.werte.length = marke;
    r.belegt.length = marke;
    r.schnapp = null;
    this.stapelSchnapp = null;
  }

  // ---------- Anweisungen ----------

  private fuehre(a: Anweisung): Abschluss {
    switch (a.art) {
      case 'Block': {
        const r = this.rahmen;
        const marke = r.namen.length;
        let e: Abschluss = null;
        for (const s of a.anweisungen) {
          e = this.fuehre(s);
          if (e) break;
        }
        this.kuerze(r, marke);
        return e;
      }
      case 'Leer':
        this.melde(a.pos.zeile, this.auf ? { art: 'anweisung', knoten: a.id } : null);
        return null;
      case 'VarDekl':
        this.deklariere(a);
        return null;
      case 'Zuweisung': {
        const mitThis = a.mitThis === true;
        if (a.op === '=') {
          this.schreibe(a.name, mitThis, this.werte(a.wert), a);
          return null;
        }
        // Wie in Java: erst den alten Wert lesen, dann die rechte Seite auswerten.
        const alt = this.zahl(this.lies(a.name, mitThis, a), a);
        const w = this.zahl(this.werte(a.wert), a.wert);
        this.schreibe(a.name, mitThis, a.op === '+=' ? (alt + w) | 0 : (alt - w) | 0, a);
        return null;
      }
      case 'Inkrement': {
        const alt = this.zahl(this.lies(a.name, false, a), a);
        this.schreibe(a.name, false, a.op === '++' ? (alt + 1) | 0 : (alt - 1) | 0, a);
        return null;
      }
      case 'AufrufAnw':
        this.aufrufAnweisung(a);
        return null;
      case 'Wenn':
        if (this.bedingung(a.bedingung, a)) return this.fuehre(a.dann);
        return a.sonst ? this.fuehre(a.sonst) : null;
      case 'Solange':
        for (;;) {
          this.pruefeSchleife(a);
          if (!this.bedingung(a.bedingung, a)) return null;
          const e = this.fuehre(a.rumpf);
          if (e) return e;
        }
      case 'Wiederhole':
        for (;;) {
          const e = this.fuehre(a.rumpf);
          if (e) return e;
          this.pruefeSchleife(a);
          if (!this.bedingung(a.bedingung, a)) return null;
        }
      case 'Zaehl': {
        const r = this.rahmen;
        const marke = r.namen.length;
        if (a.init) this.fuehre(a.init);
        let e: Abschluss = null;
        for (;;) {
          this.pruefeSchleife(a);
          if (a.bedingung && !this.bedingung(a.bedingung, a)) break;
          e = this.fuehre(a.rumpf);
          if (e) break;
          if (a.schritt) this.fuehre(a.schritt);
        }
        this.kuerze(r, marke);
        return e;
      }
      case 'Rueckgabe': {
        const wert = a.wert ? this.werte(a.wert) : undefined;
        this.melde(
          a.pos.zeile,
          this.auf ? { art: 'rueckkehr', knoten: a.id, methode: this.rahmen.methode, ...(wert !== undefined ? { wert } : {}) } : null,
        );
        return wert === undefined ? RUECK_OHNE_WERT : { wert };
      }
      case 'Luecke':
        throw this.fehler('Diese Stelle des Programms konnte die App nicht lesen.', a);
    }
  }

  private bedingung(b: Ausdruck, anweisung: Knoten): boolean {
    if (!this.auf) {
      const w = this.wahr(this.werte(b), b);
      this.melde(b.pos.zeile, null);
      return w;
    }
    const aussen = this.teile;
    const teile: { knoten: number; text: string; wert: Wert }[] = [];
    this.teile = teile;
    const w = this.wahr(this.werte(b), b);
    this.teile = aussen;
    this.melde(b.pos.zeile, { art: 'bedingung', knoten: anweisung.id, wert: w, teile });
    return w;
  }

  // ---------- Endlosschleifen ----------

  /**
   * Beweis statt Vermutung: Kommt dieselbe Schleifenbedingung in derselben Methodenaktivierung zweimal
   * im exakt gleichen Zustand (Welt, lokale Variablen, Attribute) an die Reihe, wiederholt sich ab hier
   * alles für immer. Die Aktivierung gehört dazu, weil die Rahmen darunter währenddessen stillstehen;
   * so genügen die Variablen des obersten Rahmens.
   */
  private pruefeSchleife(a: Schleife): void {
    const r = this.rahmen;
    if (this.welt !== this.letzteWelt) {
      const hash = weltHash(this.welt);
      let nr = this.weltNummern.get(hash);
      if (nr === undefined) {
        nr = this.weltNummern.size;
        this.weltNummern.set(hash, nr);
      }
      this.letzteWelt = this.welt;
      this.letzteWeltNr = nr;
    }
    const schluessel = `${a.id}|${this.letzteWeltNr}|${r.werte.join(',')}|${this.attrWerte.join(',')}`;
    r.schleifen ??= new Map();
    r.gesehen ??= new Map();
    let info = r.schleifen.get(a.id);
    if (!info) {
      info = { n: 0, schritt: 0 };
      r.schleifen.set(a.id, info);
    }
    info.n++;
    const vorher = r.gesehen.get(schluessel);
    if (vorher !== undefined) {
      throw new Abbruch({ art: 'ende', grund: 'endlosschleife', text: this.endlosText(a, info.n - vorher, info.schritt) });
    }
    r.gesehen.set(schluessel, info.n);
    info.schritt = this.anzahl;
  }

  private sensorenIn(a: Ausdruck, ziel: { name: string; typ: Typ }[] = []): { name: string; typ: Typ }[] {
    switch (a.art) {
      case 'Aufruf': {
        const e = findeEingebaut(a.name);
        if (e && e.art === 'sensor' && !this.eigene.has(a.name) && !ziel.some((z) => z.name === a.name)) {
          ziel.push({ name: a.name, typ: e.rueckgabe });
        }
        a.argumente.forEach((x) => this.sensorenIn(x, ziel));
        break;
      }
      case 'Unaer':
        this.sensorenIn(a.operand, ziel);
        break;
      case 'Binaer':
        this.sensorenIn(a.links, ziel);
        this.sensorenIn(a.rechts, ziel);
        break;
      case 'Klammer':
        this.sensorenIn(a.inhalt, ziel);
        break;
      default:
        break;
    }
    return ziel;
  }

  private endlosText(a: Schleife, zyklus: number, schrittDerLetztenPruefung: number): string {
    const bed = a.bedingung;
    const bedText = bed ? this.text(bed) : '';
    const zeile = bed ? bed.pos.zeile : a.pos.zeile;
    this.letzteZeile = zeile;
    const schleife =
      a.art === 'Zaehl'
        ? `die for-Schleife in Zeile ${a.pos.zeile}`
        : a.art === 'Wiederhole'
          ? `die do-while-Schleife mit der Bedingung \`${bedText}\` in Zeile ${zeile}`
          : `die Schleife \`while (${bedText})\` in Zeile ${zeile}`;
    const Schleife = schleife.charAt(0).toUpperCase() + schleife.slice(1);

    if (a.rumpf.art === 'Leer') {
      return `${Schleife} hat einen leeren Rumpf: Direkt hinter der Bedingung steht ein Semikolon. Es ändert sich nie etwas, wovon die Bedingung abhängt – die Schleife endet nie.`;
    }

    const sensoren = bed ? this.sensorenIn(bed) : [];
    if (this.welt.spinne.geklatscht && sensoren.length > 0) {
      const namen = sensoren.map((s) => `\`${s.name}()\``);
      const liste = namen.length === 1 ? namen[0] : `${namen.slice(0, -1).join(', ')} und ${namen[namen.length - 1]}`;
      const nurWahrheit = sensoren.every((s) => s.typ === 'boolean');
      const nurZahl = sensoren.every((s) => s.typ === 'int');
      const immer = nurWahrheit ? 'false' : nurZahl ? '0' : 'false bzw. 0';
      return `Die Spinne ist geklatscht – ${liste} ${namen.length === 1 ? 'liefert' : 'liefern'} jetzt immer ${immer}, die Schleife endet nie. Gemeint ist ${schleife}.`;
    }

    if (zyklus === 1) {
      const f = this.fehlaktion && this.fehlaktion.schritt > schrittDerLetztenPruefung ? this.fehlaktion : null;
      const grund = f ? `: \`${f.name}()\` bewirkt nichts${f.meldung ? ` („${f.meldung}“)` : ''}` : '';
      return `Im Schleifenrumpf ändert sich nichts mehr, wovon die Bedingung abhängt${grund}. Deshalb endet ${schleife} nie.`;
    }
    return `Nach ${zyklus} Durchläufen ist alles wieder genau wie vorher (Position und Blickrichtung der Spinne, Fliegen, Variablen). Die Spinne wiederholt also immer dasselbe – ${schleife} endet nie.`;
  }

  // ---------- Aufrufe ----------

  private findeMethode(name: string, anzahl: number): Methode | undefined {
    return this.eigene.get(name)?.find((m) => m.parameter.length === anzahl);
  }

  private rufe(m: Methode | Konstruktor, args: Wert[], k: Knoten): Wert | undefined {
    this.melde(k.pos.zeile, this.auf ? { art: 'aufruf', knoten: k.id, methode: m.name, args } : null);
    if (this.stapel.length >= MAX_TIEFE) {
      throw new Abbruch({ art: 'ende', grund: 'stapelueberlauf', text: this.ueberlaufText(m.name) });
    }
    this.neuerRahmen(
      m.name,
      m.parameter.map((p) => p.name),
      m.parameter.map((p) => p.typ),
      args.slice(),
    );
    let e: Abschluss = null;
    for (const s of m.rumpf.anweisungen) {
      e = this.fuehre(s);
      if (e) break;
    }
    if (!e) {
      if (m.art === 'Methode' && m.rueckgabe !== 'void') {
        throw this.fehler(`Die Methode \`${m.name}\` ist zu Ende gegangen, ohne mit \`return\` einen Wert zurückzugeben.`, m);
      }
      this.melde(m.pos.endZeile, this.auf ? { art: 'rueckkehr', knoten: m.id, methode: m.name } : null);
    }
    this.verlasseRahmen();
    return e ? e.wert : undefined;
  }

  private ueberlaufText(aufgerufen: string): string {
    const rufer = this.rahmen ? this.rahmen.methode : aufgerufen;
    const wer =
      rufer === aufgerufen
        ? `Die Methode \`${aufgerufen}\` ruft sich immer wieder selbst auf`
        : `Die Methoden \`${rufer}\` und \`${aufgerufen}\` rufen sich immer wieder gegenseitig auf`;
    return `${wer}, ohne je fertig zu werden (mehr als ${MAX_TIEFE} Aufrufe ineinander). In Java gäbe das einen StackOverflowError. Prüfe, ob es einen Fall gibt, in dem kein weiterer Aufruf mehr passiert.`;
  }

  private argumente(a: Aufruf, parameter: { name: string; typ: WertTyp | 'int' }[]): Wert[] {
    if (a.argumente.length !== parameter.length) {
      throw this.fehler(`\`${a.name}\` erwartet ${parameter.length} Wert(e) in den Klammern, übergeben wurden ${a.argumente.length}.`, a);
    }
    const args: Wert[] = [];
    for (let i = 0; i < a.argumente.length; i++) {
      const w = this.werte(a.argumente[i]);
      if ((parameter[i].typ === 'int') !== (typeof w === 'number')) {
        throw this.fehler(`Der Wert ${w} passt nicht zum Parameter \`${parameter[i].typ} ${parameter[i].name}\` von \`${a.name}\`.`, a);
      }
      args.push(w);
    }
    return args;
  }

  private aufrufAnweisung(anw: AufrufAnw): void {
    const a = anw.aufruf;
    const m = this.findeMethode(a.name, a.argumente.length);
    if (m) {
      this.rufe(m, this.argumente(a, m.parameter), anw);
      return;
    }
    const e = findeEingebaut(a.name);
    if (!e || this.eigene.has(a.name)) throw this.fehler(`Die Methode \`${a.name}()\` gibt es nicht.`, a);
    const args = this.argumente(a, e.parameter);
    if (e.rueckgabe !== 'void') {
      // Eine Abfrage als eigene Anweisung: Die Antwort verfällt, die Welt bleibt, wie sie ist.
      this.melde(anw.pos.zeile, this.auf ? { art: 'anweisung', knoten: anw.id } : null);
      return;
    }
    const w = aktion(this.welt, a.name, args as number[]);
    if (w.fehler !== undefined) throw this.fehler(w.fehler, anw);
    this.welt = w.welt;
    if (w.meldung !== undefined) this.konsole.push(w.meldung);
    this.zaehler[a.name] = (this.zaehler[a.name] ?? 0) + 1;
    if (!w.ok) this.fehlaktion = { name: a.name, ...(w.meldung !== undefined ? { meldung: w.meldung } : {}), schritt: this.anzahl + 1 };
    this.melde(
      anw.pos.zeile,
      this.auf ? { art: 'aktion', knoten: anw.id, name: a.name, ok: w.ok, ...(w.meldung !== undefined ? { meldung: w.meldung } : {}) } : null,
    );
  }

  private aufrufWert(a: Aufruf): Wert {
    const m = this.findeMethode(a.name, a.argumente.length);
    if (m) {
      const args = this.argumente(a, m.parameter);
      // Bedingungen innerhalb der aufgerufenen Methode sammeln ihre eigenen Teilausdrücke.
      const teile = this.teile;
      this.teile = null;
      const w = this.rufe(m, args, a);
      this.teile = teile;
      if (w === undefined) throw this.fehler(`\`${a.name}()\` liefert keinen Wert zurück (\`void\`) und kann nicht als Wert benutzt werden.`, a);
      return w;
    }
    const e = findeEingebaut(a.name);
    if (!e || this.eigene.has(a.name)) throw this.fehler(`Die Methode \`${a.name}()\` gibt es nicht.`, a);
    if (e.rueckgabe === 'void') {
      throw this.fehler(`\`${a.name}()\` ist eine Aktion und liefert keinen Wert zurück (\`void\`).`, a);
    }
    this.argumente(a, e.parameter);
    return sensor(this.welt, a.name);
  }

  // ---------- Ausdrücke ----------

  private zahl(w: Wert, k: Knoten): number {
    if (typeof w !== 'number') throw this.fehler(`Hier wird eine Zahl gebraucht, \`${this.text(k)}\` ist aber ein Wahrheitswert.`, k);
    return w;
  }

  private wahr(w: Wert, k: Knoten): boolean {
    if (typeof w !== 'boolean') throw this.fehler(`Hier wird ein Wahrheitswert gebraucht, \`${this.text(k)}\` ist aber eine Zahl.`, k);
    return w;
  }

  private werte(a: Ausdruck): Wert {
    let w: Wert;
    switch (a.art) {
      case 'Zahl':
      case 'Wahrheit':
        return a.wert;
      case 'Klammer':
        return this.werte(a.inhalt);
      case 'Var':
        w = this.liesVar(a);
        break;
      case 'Aufruf':
        w = this.aufrufWert(a);
        break;
      case 'Unaer': {
        const o = this.werte(a.operand);
        w = a.op === '!' ? !this.wahr(o, a.operand) : -this.zahl(o, a.operand) | 0;
        break;
      }
      case 'Binaer':
        w = this.binaer(a);
        break;
      case 'Luecke':
        throw this.fehler('Diese Stelle des Programms konnte die App nicht lesen.', a);
    }
    if (this.teile) this.teile.push({ knoten: a.id, text: this.text(a), wert: w });
    return w;
  }

  private liesVar(a: Var): Wert {
    return this.lies(a.name, a.mitThis === true, a);
  }

  private binaer(a: Binaer): Wert {
    switch (a.op) {
      // Kurzschluss wie in Java: Die rechte Seite wird nur ausgewertet, wenn sie noch etwas ändern kann.
      case '&&':
        return this.wahr(this.werte(a.links), a.links) ? this.wahr(this.werte(a.rechts), a.rechts) : false;
      case '||':
        return this.wahr(this.werte(a.links), a.links) ? true : this.wahr(this.werte(a.rechts), a.rechts);
      case '&':
      case '|': {
        const l = this.werte(a.links);
        const r = this.werte(a.rechts);
        if (typeof l === 'boolean' && typeof r === 'boolean') return a.op === '&' ? l && r : l || r;
        if (typeof l === 'number' && typeof r === 'number') return a.op === '&' ? l & r : l | r;
        throw this.fehler(`\`${a.op}\` braucht links und rechts denselben Typ.`, a);
      }
      case '==': {
        const l = this.werte(a.links);
        return l === this.werte(a.rechts);
      }
      case '!=': {
        const l = this.werte(a.links);
        return l !== this.werte(a.rechts);
      }
      default: {
        const l = this.zahl(this.werte(a.links), a.links);
        const r = this.zahl(this.werte(a.rechts), a.rechts);
        switch (a.op) {
          case '<':
            return l < r;
          case '<=':
            return l <= r;
          case '>':
            return l > r;
          case '>=':
            return l >= r;
          // int rechnet mit 32 Bit und läuft bei zu großen Werten über.
          case '+':
            return (l + r) | 0;
          case '-':
            return (l - r) | 0;
          case '*':
            return Math.imul(l, r);
          case '/':
          case '%':
            if (r === 0) {
              throw this.fehler(
                `Division durch 0 in Zeile ${a.pos.zeile}: \`${this.text(a)}\`. Durch 0 kann man nicht teilen – Java bricht hier mit einer ArithmeticException („/ by zero“) ab.`,
                a,
              );
            }
            // Ganzzahldivision schneidet zur Null hin ab; der Rest hat das Vorzeichen des Dividenden.
            return a.op === '/' ? (l / r) | 0 : (l % r) | 0;
        }
      }
    }
  }

  // ---------- Ablauf ----------

  private initialisiere(): void {
    const klasse = this.programm.klasse;
    this.auf = false;
    this.neuerRahmen(klasse.name, [], [], []);
    for (const f of klasse.felder) {
      this.attrNamen.push(f.name);
      this.attrTypen.push(f.typ);
      this.attrWerte.push(f.typ === 'int' ? 0 : false);
    }
    for (const f of klasse.felder) {
      if (f.wert) this.schreibe(f.name, true, this.werte(f.wert), f);
    }
    const konstruktor = klasse.konstruktoren.find((k) => k.parameter.length === 0);
    if (konstruktor) this.rufe(konstruktor, [], konstruktor);
    this.verlasseRahmen();
    this.auf = this.rec;
  }

  lauf(methode: string, args: Wert[]): Lauf {
    let ende: EndeEreignis;
    let rueckgabe: Wert | undefined;
    try {
      this.initialisiere();
      const klasse = this.programm.klasse;
      const m = this.findeMethode(methode, args.length);
      if (!m) {
        const andere = this.eigene.get(methode)?.[0];
        throw this.fehler(
          andere
            ? `Die Methode \`${methode}\` erwartet ${andere.parameter.length} Wert(e), übergeben wurden ${args.length}.`
            : `Eine Methode namens \`${methode}\` gibt es in der Klasse \`${klasse.name}\` nicht.`,
          andere ?? klasse,
        );
      }
      m.parameter.forEach((p, i) => {
        const w = args[i];
        const passt = p.typ === 'int' ? typeof w === 'number' && Number.isInteger(w) : typeof w === 'boolean';
        if (!passt) throw this.fehler(`Für den Parameter \`${p.typ} ${p.name}\` von \`${methode}\` passt der Wert ${String(w)} nicht.`, m);
      });
      rueckgabe = this.rufe(
        m,
        args.map((w) => (typeof w === 'number' ? w | 0 : w)),
        m,
      );
      ende = { art: 'ende', grund: 'fertig' };
    } catch (e) {
      if (e instanceof Abbruch) ende = e.ende;
      else if (e instanceof RangeError) {
        // Sicherheitsnetz, falls der JavaScript-Stapel vor der eigenen Tiefengrenze voll ist.
        ende = { art: 'ende', grund: 'stapelueberlauf', text: this.ueberlaufText(this.rahmen ? this.rahmen.methode : methode) };
      } else {
        ende = { art: 'ende', grund: 'laufzeitfehler', text: `Interner Fehler der App: ${e instanceof Error ? e.message : String(e)}` };
      }
    }
    if (this.rec) {
      this.stapelSchnapp = null;
      this.zeichneAuf(ende, this.letzteZeile);
    }
    return {
      schritte: this.schritte,
      konsole: this.konsole,
      endwelt: this.welt,
      ...(rueckgabe !== undefined ? { rueckgabe } : {}),
      ende,
      zaehler: this.zaehler,
    };
  }
}

/**
 * Führt eine Methode des Programms auf der Startwelt aus. Wirft nie: Jeder Lauf endet mit einem
 * `ende`-Ereignis (fertig, Schrittlimit, bewiesene Endlosschleife, Stapelüberlauf oder Laufzeitfehler).
 */
export function fuehreAus(
  programm: Programm,
  methode: string,
  args: Wert[],
  start: Welt,
  opt?: { maxSchritte?: number; aufzeichnen?: boolean },
): Lauf {
  return new Ausfuehrung(programm, start, opt).lauf(methode, args);
}

/** Alle Methoden, die man von außen starten kann (alles außer `private`). */
export function oeffentlicheMethoden(programm: Programm): MethodenInfo[] {
  return programm.klasse.methoden
    .filter((m) => m.sicht !== 'private')
    .map((m) => ({ name: m.name, parameter: m.parameter.map((p) => ({ name: p.name, typ: p.typ })), rueckgabe: m.rueckgabe }));
}
