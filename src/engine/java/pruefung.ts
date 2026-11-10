// Namens- und Typprüfung. Läuft nur auf einem lückenlosen Baum und meldet das, was der
// Java-Compiler nach dem Parsen bemängeln würde – in Worten, die ein Schüler versteht.

import { aehnliche } from './aehnlich';
import type {
  Anweisung,
  Aufruf,
  Ausdruck,
  Binaer,
  Block,
  Diagnose,
  Konstruktor,
  Methode,
  Pos,
  Programm,
  Rueckgabe,
  Typ,
  Var,
  VarDekl,
  Wenn,
  WertTyp,
  Zuweisung,
} from './ast';
import { EINGEBAUT, findeEingebaut, GREENFOOT_FREMD, type Eingebaut } from './builtins';

type ATyp = Typ | 'unbekannt';

interface VarInfo {
  name: string;
  typ: WertTyp;
  zeile: number;
  art: 'lokal' | 'parameter' | 'attribut';
}

interface Erwartung {
  soll: WertTyp;
  code: 'typ-bedingung' | 'typ-falsch';
  /** Satzanfang, der sagt, wo der Wert gebraucht wird, z.B. "Die Bedingung von `while`". */
  wo: string;
  javac?: (ist: Typ) => string;
}

const TYP_WORT: Record<Typ, string> = {
  int: 'eine Zahl (`int`)',
  boolean: 'ein Wahrheitswert (`boolean`)',
  void: 'nichts (`void`)',
};

const TIPP_ZWILLING =
  'Merke: `fliegeAmPlatz()` und `fliegeGefressen()` (Einzahl) antworten mit true/false; `fliegenAmPlatz()` und `fliegenGefressen()` (Mehrzahl) liefern eine Anzahl.';
const TIPP_NAMEN =
  'Schreibe Methodennamen genau so wie auf dem Spickzettel: Sie beginnen klein, jedes weitere Wort beginnt groß (z.B. `linksDrehen`).';

function ohneKlammern(a: Ausdruck): Ausdruck {
  let k = a;
  while (k.art === 'Klammer') k = k.inhalt;
  return k;
}

function istKonstantWahr(a: Ausdruck): boolean {
  const k = ohneKlammern(a);
  return k.art === 'Wahrheit' && k.wert;
}

export function pruefe(programm: Programm): Diagnose[] {
  return new Pruefer(programm).alles();
}

class Pruefer {
  private readonly diagnosen: Diagnose[] = [];
  private readonly eigene = new Map<string, Methode[]>();
  private readonly attribute = new Map<string, VarInfo>();
  private bereiche: Map<string, VarInfo>[] = [];
  /** Lokale Variablen, deren Block schon zu Ende ist: Name → Zeile der Deklaration. */
  private vergangen = new Map<string, number>();
  /** Unbekannte Namen, die in dieser Methode schon gemeldet wurden – einmal je Methode genügt. */
  private unbekannte = new Set<string>();
  private unterdrueckt = 0;
  private belegt = new Set<VarInfo>();
  private tot = false;
  private methode: Methode | Konstruktor | null = null;
  private nutztEingebaute = false;

  constructor(private readonly programm: Programm) {}

  // ---------- Hilfen ----------

  private text(pos: Pos, max = 50): string {
    const t = this.programm.quelltext.slice(pos.von, pos.bis).replace(/\s+/g, ' ').trim();
    return t.length > max ? `${t.slice(0, max - 1)}…` : t;
  }

  private posBei(von: number, bis: number): Pos {
    const q = this.programm.quelltext;
    let zeile = 1;
    let zeilenStart = 0;
    for (let i = 0; i < von; i++) {
      if (q[i] === '\n') {
        zeile++;
        zeilenStart = i + 1;
      }
    }
    return { von, bis, zeile, spalte: von - zeilenStart + 1, endZeile: zeile };
  }

  private melde(d: Diagnose): void {
    this.diagnosen.push(d);
  }

  private fehler(code: string, pos: Pos, text: string, extra: Partial<Diagnose> = {}): void {
    this.melde({ code, schwere: 'fehler', pos, text, ...extra });
  }

  private finde(name: string): VarInfo | undefined {
    for (let i = this.bereiche.length - 1; i >= 0; i--) {
      const v = this.bereiche[i].get(name);
      if (v) return v;
    }
    return this.attribute.get(name);
  }

  private sichtbareNamen(): string[] {
    const namen = [...this.attribute.keys()];
    for (const b of this.bereiche) namen.push(...b.keys());
    return namen;
  }

  private alleMethodennamen(): string[] {
    return [...this.eigene.keys(), ...EINGEBAUT.map((e) => e.name)];
  }

  private signatur(name: string, parameter: { name: string; typ: string }[]): string {
    return `${name}(${parameter.map((p) => `${p.typ} ${p.name}`).join(', ')})`;
  }

  // ---------- Klasse ----------

  alles(): Diagnose[] {
    const klasse = this.programm.klasse;

    for (const f of klasse.felder) {
      const vorhanden = this.attribute.get(f.name);
      if (vorhanden) {
        this.fehler('variable-doppelt', f.pos, `Das Attribut \`${f.name}\` gibt es schon (deklariert in Zeile ${vorhanden.zeile}). Wähle einen anderen Namen.`, {
          javac: `variable ${f.name} is already defined in class ${klasse.name}`,
        });
        continue;
      }
      this.attribute.set(f.name, { name: f.name, typ: f.typ, zeile: f.pos.zeile, art: 'attribut' });
    }

    for (const m of klasse.methoden) {
      const liste = this.eigene.get(m.name) ?? [];
      const gleicheAnzahl = liste.find((x) => x.parameter.length === m.parameter.length);
      if (gleicheAnzahl) {
        const gleicheTypen = gleicheAnzahl.parameter.every((p, i) => p.typ === m.parameter[i].typ);
        if (gleicheTypen) {
          this.fehler(
            'methode-doppelt',
            m.kopf,
            `Die Methode \`${this.signatur(m.name, m.parameter)}\` gibt es schon (Zeile ${gleicheAnzahl.pos.zeile}). Zwei Methoden einer Klasse dürfen nicht gleich heißen und dieselben Parameter haben.`,
            { javac: `method ${m.name}(${m.parameter.map((p) => p.typ).join(',')}) is already defined in class ${klasse.name}` },
          );
        } else {
          this.melde({
            code: 'nicht-unterstuetzt',
            schwere: 'nicht-unterstuetzt',
            pos: m.kopf,
            text: `Das kann die App nicht ausführen: zwei Methoden namens \`${m.name}\` mit gleich vielen Parametern. Gib einer der beiden einen anderen Namen.`,
          });
        }
        continue;
      }
      liste.push(m);
      this.eigene.set(m.name, liste);
      const eingebaut = findeEingebaut(m.name);
      if (eingebaut && eingebaut.parameter.length === m.parameter.length) {
        this.melde({
          code: 'eingebaut-ueberschrieben',
          schwere: 'warnung',
          pos: m.kopf,
          text: `Deine Klasse hat eine eigene Methode \`${m.name}()\`. Sie ersetzt die gleichnamige Methode der Spinne: Jeder Aufruf von \`${m.name}()\` landet jetzt bei deiner Version – auch der Aufruf in der Methode selbst.`,
          tipp: 'Gib eigenen Methoden Namen, die es in der Klasse Spinne noch nicht gibt.',
        });
      }
    }

    for (const f of klasse.felder) {
      if (!f.wert) continue;
      this.methode = null;
      this.bereiche = [];
      const t = this.typ(f.wert);
      this.erwarte(f.wert, t, {
        soll: f.typ,
        code: 'typ-falsch',
        wo: `Das Attribut \`${f.name}\` hat den Typ \`${f.typ}\`; als Anfangswert`,
      });
    }

    for (const m of [...klasse.konstruktoren, ...klasse.methoden]) this.pruefeMethode(m);

    if (!this.programm.nurMethoden && !klasse.oberklasse && this.nutztEingebaute) {
      const kopf = /class\s+[\p{L}\p{N}_$]+/u.exec(this.programm.quelltext.slice(klasse.pos.von));
      const ende = kopf ? klasse.pos.von + kopf.index + kopf[0].length : klasse.pos.von;
      this.fehler(
        'extends-fehlt',
        this.posBei(klasse.pos.von, ende),
        `Im Klassenkopf fehlt \`extends Spinne\`. Ohne diesen Zusatz ist \`${klasse.name}\` keine Spinne und kennt Methoden wie \`schritt()\` oder \`hindernisVorn()\` gar nicht.`,
        {
          javac: 'cannot find symbol',
          tipp: 'Der Klassenkopf lautet immer `public class Tarantel extends Spinne` – durch `extends` erbt die Tarantel alle Methoden der Spinne.',
          ...(kopf ? { reparatur: { von: ende, bis: ende, ersatz: ' extends Spinne' } } : {}),
        },
      );
    }
    return this.diagnosen;
  }

  private pruefeMethode(m: Methode | Konstruktor): void {
    this.methode = m;
    this.bereiche = [new Map()];
    this.vergangen = new Map();
    this.unbekannte = new Set();
    this.belegt = new Set();
    this.tot = false;
    for (const p of m.parameter) {
      if (this.bereiche[0].has(p.name)) {
        this.fehler('variable-doppelt', p.pos, `Den Parameter \`${p.name}\` gibt es in diesem Methodenkopf schon. Jeder Parameter braucht einen eigenen Namen.`, {
          javac: `variable ${p.name} is already defined in method ${m.name}`,
        });
        continue;
      }
      const info: VarInfo = { name: p.name, typ: p.typ, zeile: p.pos.zeile, art: 'parameter' };
      this.bereiche[0].set(p.name, info);
      this.belegt.add(info);
    }
    const kannEnden = this.anweisungen(m.rumpf);
    if (m.art === 'Methode' && m.rueckgabe !== 'void' && kannEnden) {
      const hatReturn = this.programm.quelltext.slice(m.rumpf.pos.von, m.rumpf.pos.bis).includes('return');
      this.fehler(
        'return-fehlt',
        this.posBei(m.pos.bis - 1, m.pos.bis),
        `Die Methode \`${m.name}\` verspricht im Kopf einen Rückgabewert vom Typ \`${m.rueckgabe}\`, aber am Ende der Methode fehlt ein \`return\`. Jeder Weg durch die Methode muss mit \`return wert;\` enden.${
          hatReturn
            ? ' Ein `return` innerhalb von `if` oder einer Schleife reicht nicht – Java verlangt auch eines für den Fall, dass die Bedingung nicht zutrifft.'
            : ''
        }`,
        {
          javac: 'missing return statement',
          tipp: 'Bei Methoden mit `int` oder `boolean` im Kopf: Prüfe, ob auch die allerletzte Anweisung ein `return` ist.',
        },
      );
    }
    this.methode = null;
  }

  // ---------- Anweisungen (Rückgabe: kann die Anweisung normal zu Ende gehen?) ----------

  private anweisungen(b: Block): boolean {
    const totVorher = this.tot;
    let kannEnden = true;
    let gemeldet = false;
    for (const a of b.anweisungen) {
      if (!kannEnden && !gemeldet) {
        gemeldet = true;
        this.fehler(
          'unerreichbar',
          a.pos,
          'Diese Anweisung kann nie ausgeführt werden: Direkt davor wird die Methode mit `return` verlassen (oder eine Schleife läuft endlos).',
          { javac: 'unreachable statement', tipp: 'Nach `return` ist die Methode sofort zu Ende – dahinter darf im selben Block nichts mehr stehen.' },
        );
        this.tot = true;
      }
      if (!this.anweisung(a)) kannEnden = false;
    }
    this.tot = totVorher;
    return kannEnden;
  }

  private imBereich(a: Anweisung): boolean {
    const bereich = new Map<string, VarInfo>();
    this.bereiche.push(bereich);
    const ergebnis = a.art === 'Block' ? this.anweisungen(a) : this.anweisung(a);
    this.bereiche.pop();
    for (const v of bereich.values()) this.vergangen.set(v.name, v.zeile);
    return ergebnis;
  }

  private anweisung(a: Anweisung): boolean {
    switch (a.art) {
      case 'Block':
        return this.imBereich(a);
      case 'Leer':
      case 'Luecke':
        return true;
      case 'VarDekl':
        this.varDekl(a);
        return true;
      case 'Zuweisung':
        this.zuweisung(a);
        return true;
      case 'Inkrement': {
        const info = this.variable(a.name, a.pos, false);
        if (info && info.typ !== 'int') {
          this.fehler('typ-falsch', a.pos, `\`${a.op}\` zählt um 1 ${a.op === '++' ? 'hoch' : 'herunter'} und geht nur bei Zahlen. \`${a.name}\` ist aber vom Typ \`boolean\`.`, {
            javac: `bad operand type boolean for unary operator '${a.op}'`,
          });
        }
        return true;
      }
      case 'AufrufAnw': {
        const t = this.aufruf(a.aufruf);
        const e = findeEingebaut(a.aufruf.name);
        if (e && e.art === 'sensor' && !this.eigene.has(a.aufruf.name) && t !== 'unbekannt') {
          this.melde({
            code: 'ergebnis-unbenutzt',
            schwere: 'warnung',
            pos: a.pos,
            text: `\`${a.aufruf.name}()\` stellt nur eine Frage („${e.phrase}“). Als eigene Anweisung passiert damit nichts – die Antwort geht verloren. Gehört der Aufruf in eine Bedingung von \`if\` oder \`while\`?`,
            tipp: 'Abfragen (Sensoren) stehen in Bedingungen, Aktionen stehen als eigene Anweisung mit Semikolon.',
          });
        }
        return true;
      }
      case 'Wenn':
        return this.wenn(a);
      case 'Solange': {
        this.bedingung(a.bedingung, 'while');
        const start = new Set(this.belegt);
        this.imBereich(a.rumpf);
        this.belegt = start;
        return !istKonstantWahr(a.bedingung);
      }
      case 'Wiederhole': {
        const rumpfEndet = this.imBereich(a.rumpf);
        this.bedingung(a.bedingung, 'while');
        return rumpfEndet && !istKonstantWahr(a.bedingung);
      }
      case 'Zaehl': {
        const bereich = new Map<string, VarInfo>();
        this.bereiche.push(bereich);
        if (a.init) this.anweisung(a.init);
        if (a.bedingung) this.bedingung(a.bedingung, 'for');
        const start = new Set(this.belegt);
        this.imBereich(a.rumpf);
        if (a.schritt) this.anweisung(a.schritt);
        this.belegt = start;
        this.bereiche.pop();
        for (const v of bereich.values()) {
          this.vergangen.set(v.name, v.zeile);
          this.belegt.delete(v);
        }
        return a.bedingung !== undefined && !istKonstantWahr(a.bedingung);
      }
      case 'Rueckgabe':
        this.rueckgabe(a);
        return false;
    }
  }

  private wenn(a: Wenn): boolean {
    this.bedingung(a.bedingung, 'if');
    const start = new Set(this.belegt);
    const e1 = this.imBereich(a.dann);
    const nach1 = this.belegt;
    this.belegt = new Set(start);
    const e2 = a.sonst ? this.imBereich(a.sonst) : true;
    const nach2 = this.belegt;
    if (e1 && e2) this.belegt = new Set([...nach1].filter((v) => nach2.has(v)));
    else if (e1) this.belegt = nach1;
    else this.belegt = nach2;
    return e1 || e2;
  }

  private varDekl(a: VarDekl): void {
    const m = this.methode;
    let vorhanden: VarInfo | undefined;
    for (const b of this.bereiche) vorhanden = vorhanden ?? b.get(a.name);
    const info: VarInfo = { name: a.name, typ: a.typ, zeile: a.pos.zeile, art: 'lokal' };
    if (vorhanden) {
      const kopf = /^(int|boolean)\s+/.exec(this.programm.quelltext.slice(a.pos.von, a.pos.bis));
      const alsZuweisung = a.wert !== undefined && vorhanden.typ === a.typ && kopf !== null;
      this.fehler(
        'variable-doppelt',
        a.pos,
        `Die Variable \`${a.name}\` gibt es in dieser Methode schon (${vorhanden.art === 'parameter' ? 'als Parameter' : 'deklariert'} in Zeile ${vorhanden.zeile}). ` +
          'Willst du ihr nur einen neuen Wert geben, lass den Typ davor weg; sonst wähle einen anderen Namen.',
        {
          javac: `variable ${a.name} is already defined in method ${m ? m.name : ''}`,
          tipp: 'Der Typ (`int`, `boolean`) steht nur beim allerersten Mal vor einer Variablen – dort, wo sie angelegt wird.',
          ...(alsZuweisung ? { reparatur: { von: a.pos.von, bis: a.pos.von + kopf[0].length, ersatz: '' } } : {}),
        },
      );
    } else {
      this.bereiche[this.bereiche.length - 1].set(a.name, info);
      this.vergangen.delete(a.name);
    }
    if (a.wert) {
      const t = this.typ(a.wert);
      this.erwarte(a.wert, t, {
        soll: a.typ,
        code: 'typ-falsch',
        wo: `Die Variable \`${a.name}\` hat den Typ \`${a.typ}\`; als Anfangswert`,
      });
      this.belegt.add(vorhanden ?? info);
    }
  }

  private zuweisung(a: Zuweisung): void {
    const info = a.mitThis ? this.attribute.get(a.name) : this.finde(a.name);
    if (!info) {
      // Kommt derselbe unbekannte Name auch rechts vor (`zaehler = zaehler + 1`), soll es bei einer Meldung bleiben.
      const schonGemeldet = this.unbekannte.has(a.name);
      const vorher = this.unterdrueckt;
      this.unbekannte.add(a.name);
      const typRechts = this.typ(a.wert);
      const selbstbezug = this.unterdrueckt > vorher;
      if (schonGemeldet) return;
      this.unbekannte.delete(a.name);
      this.variableUnbekannt(a.name, { ...a.pos, bis: a.pos.von + a.name.length, endZeile: a.pos.zeile }, a.mitThis === true, {
        zuweisung: a,
        typ: typRechts,
        selbstbezug,
      });
      return;
    }
    const t = this.typ(a.wert);
    if (a.op === '=') {
      this.erwarte(a.wert, t, { soll: info.typ, code: 'typ-falsch', wo: `Die Variable \`${a.name}\` hat den Typ \`${info.typ}\`; als neuer Wert` });
      this.belegt.add(info);
      return;
    }
    this.pruefeBelegt(info, a.pos);
    if (info.typ !== 'int') {
      this.fehler('typ-falsch', a.pos, `\`${a.op}\` rechnet und geht nur bei Zahlen. \`${a.name}\` ist aber vom Typ \`boolean\`.`, {
        javac: `bad operand types for binary operator '${a.op[0]}'`,
      });
    }
    this.erwarte(a.wert, t, { soll: 'int', code: 'typ-falsch', wo: `Hinter \`${a.op}\`` });
  }

  private rueckgabe(a: Rueckgabe): void {
    const m = this.methode;
    const soll: Typ = m && m.art === 'Methode' ? m.rueckgabe : 'void';
    const name = m ? m.name : '';
    if (!a.wert) {
      if (soll !== 'void') {
        this.fehler(
          'return-ohne-wert',
          a.pos,
          `Die Methode \`${name}\` muss einen Wert vom Typ \`${soll}\` zurückgeben. Hinter \`return\` fehlt dieser Wert, z.B. \`return ${soll === 'int' ? '0' : 'true'};\`.`,
          { javac: 'incompatible types: missing return value' },
        );
      }
      return;
    }
    const t = this.typ(a.wert);
    if (soll === 'void') {
      this.fehler(
        'rueckgabe-in-void',
        a.pos,
        m && m.art === 'Konstruktor'
          ? 'Ein Konstruktor gibt nichts zurück. Hinter `return` darf deshalb kein Wert stehen.'
          : `Die Methode \`${name}\` ist \`void\`, sie liefert also nichts zurück. Hinter \`return\` darf deshalb kein Wert stehen. Soll sie doch einen Wert liefern, muss im Methodenkopf statt \`void\` der Typ \`${t === 'boolean' ? 'boolean' : 'int'}\` stehen.`,
        {
          javac: 'incompatible types: unexpected return value',
          tipp: 'Der Typ vor dem Methodennamen sagt, was `return` liefern muss: `void` = nichts, `int` = eine Zahl, `boolean` = true oder false.',
        },
      );
      return;
    }
    this.erwarte(a.wert, t, { soll, code: 'typ-falsch', wo: `Die Methode \`${name}\` gibt \`${soll}\` zurück; hinter \`return\`` });
  }

  // ---------- Ausdrücke ----------

  private bedingung(a: Ausdruck, wort: 'if' | 'while' | 'for'): void {
    const t = this.typ(a);
    this.erwarte(a, t, { soll: 'boolean', code: 'typ-bedingung', wo: `Die Bedingung von \`${wort}\`` });
  }

  /** Meldet, wenn ein Ausdruck nicht den erwarteten Typ hat – mit eigener Erklärung für Zwillinge und void. */
  private erwarte(a: Ausdruck, ist: ATyp, e: Erwartung): void {
    if (ist === 'unbekannt' || ist === e.soll) return;
    const kern = ohneKlammern(a);
    const quelle = this.text(a.pos);
    const javac = e.javac ? e.javac(ist) : `incompatible types: ${ist} cannot be converted to ${e.soll}`;
    const istBedingung = e.code === 'typ-bedingung';

    if (kern.art === 'Aufruf' && !this.eigene.has(kern.name)) {
      const eingebaut = findeEingebaut(kern.name);
      const zwilling = eingebaut?.zwilling ? findeEingebaut(eingebaut.zwilling) : undefined;
      if (eingebaut && zwilling && zwilling.rueckgabe === e.soll) {
        const text =
          e.soll === 'boolean'
            ? `\`${kern.name}()\` liefert eine Zahl (wie viele Fliegen), keine Antwort auf eine Ja/Nein-Frage. ${istBedingung ? 'Für die Bedingung' : 'Hier'} brauchst du den Zwilling \`${zwilling.name}()\` – oder du vergleichst die Zahl, z.B. \`${kern.name}() > 0\`.`
            : `\`${kern.name}()\` beantwortet nur, ob überhaupt eine Fliege da ist (true oder false). Die Anzahl liefert der Zwilling \`${zwilling.name}()\`.`;
        this.fehler('zwilling-verwechselt', kern.namePos, text, {
          javac,
          tipp: TIPP_ZWILLING,
          reparatur: { von: kern.namePos.von, bis: kern.namePos.bis, ersatz: zwilling.name },
        });
        return;
      }
    }

    if (ist === 'void') {
      const name = kern.art === 'Aufruf' ? `\`${kern.name}()\`` : `\`${quelle}\``;
      this.fehler(
        e.code,
        a.pos,
        istBedingung
          ? `${name} ist eine Aktion: Die Methode tut etwas, liefert aber keinen Wert zurück (\`void\`). In einer Bedingung muss eine Frage stehen, deren Antwort wahr oder falsch ist, z.B. \`hindernisVorn()\`.`
          : `${name} liefert keinen Wert zurück (\`void\`). ${e.wo} wird aber ${TYP_WORT[e.soll]} gebraucht.`,
        {
          javac,
          tipp: 'Aktionen (schritt, linksDrehen, fliegeFressen …) stehen als eigene Anweisung; in Bedingungen gehören nur Abfragen (hindernisVorn, fliegeAmPlatz …).',
        },
      );
      return;
    }

    if (istBedingung) {
      this.fehler(
        e.code,
        a.pos,
        `${e.wo} muss wahr oder falsch sein (Typ \`boolean\`). \`${quelle}\` ist aber ${TYP_WORT[ist]}. Mache daraus einen Vergleich, z.B. \`${quelle} > 0\`.`,
        { javac, tipp: 'In die Klammern von if und while gehört immer eine Ja/Nein-Frage: eine Abfrage-Methode oder ein Vergleich.' },
      );
      return;
    }
    this.fehler(e.code, a.pos, `${e.wo} wird ${TYP_WORT[e.soll]} gebraucht. \`${quelle}\` ist aber ${TYP_WORT[ist]}.`, { javac });
  }

  private typ(a: Ausdruck): ATyp {
    switch (a.art) {
      case 'Zahl':
        return 'int';
      case 'Wahrheit':
        return 'boolean';
      case 'Luecke':
        return 'unbekannt';
      case 'Klammer':
        return this.typ(a.inhalt);
      case 'Var':
        return this.varTyp(a);
      case 'Aufruf':
        return this.aufruf(a);
      case 'Unaer': {
        const t = this.typ(a.operand);
        const soll: WertTyp = a.op === '!' ? 'boolean' : 'int';
        this.erwarte(a.operand, t, {
          soll,
          code: 'typ-falsch',
          wo: a.op === '!' ? 'Hinter dem Nicht-Zeichen `!`' : 'Hinter dem Minuszeichen',
          javac: (ist) => `bad operand type ${ist} for unary operator '${a.op}'`,
        });
        return soll;
      }
      case 'Binaer':
        return this.binaer(a);
    }
  }

  private binaer(a: Binaer): ATyp {
    const l = this.typ(a.links);
    const r = this.typ(a.rechts);
    const javac = (): string =>
      `bad operand types for binary operator '${a.op}'\n  first type:  ${l === 'unbekannt' ? '?' : l}\n  second type: ${r === 'unbekannt' ? '?' : r}`;
    const beide = (soll: WertTyp, wo: string): void => {
      this.erwarte(a.links, l, { soll, code: 'typ-falsch', wo: `Links von ${wo}`, javac });
      this.erwarte(a.rechts, r, { soll, code: 'typ-falsch', wo: `Rechts von ${wo}`, javac });
    };
    switch (a.op) {
      case '&&':
      case '||':
        beide('boolean', `\`${a.op}\``);
        return 'boolean';
      case '&':
      case '|':
        if (l === 'int' && r === 'int') return 'int';
        beide('boolean', `\`${a.op}\``);
        return 'boolean';
      case '==':
      case '!=': {
        if (l === 'unbekannt' || r === 'unbekannt') return 'boolean';
        if (l === 'void' || r === 'void') {
          const seite = l === 'void' ? a.links : a.rechts;
          this.erwarte(seite, 'void', { soll: l === 'void' && r !== 'void' ? r : 'int', code: 'typ-falsch', wo: `Beim Vergleich mit \`${a.op}\``, javac });
          return 'boolean';
        }
        if (l !== r) {
          // Erst die Seite prüfen, bei der ein Zwilling den Fehler erklärt.
          const vorher = this.diagnosen.length;
          this.erwarteZwilling(a.links, r);
          if (this.diagnosen.length === vorher) this.erwarteZwilling(a.rechts, l);
          if (this.diagnosen.length === vorher) {
            this.fehler(
              'typ-falsch',
              a.pos,
              `Mit \`${a.op}\` kannst du nur Gleichartiges vergleichen. Links steht ${TYP_WORT[l]}, rechts ${TYP_WORT[r]}.`,
              { javac: `incomparable types: ${l} and ${r}` },
            );
          }
        }
        return 'boolean';
      }
      case '<':
      case '<=':
      case '>':
      case '>=':
        beide('int', `\`${a.op}\``);
        return 'boolean';
      default:
        beide('int', `\`${a.op}\``);
        return 'int';
    }
  }

  private erwarteZwilling(a: Ausdruck, soll: WertTyp): void {
    const kern = ohneKlammern(a);
    if (kern.art !== 'Aufruf' || this.eigene.has(kern.name)) return;
    const e = findeEingebaut(kern.name);
    const zwilling = e?.zwilling ? findeEingebaut(e.zwilling) : undefined;
    if (zwilling && zwilling.rueckgabe === soll) {
      this.erwarte(a, e!.rueckgabe, { soll, code: 'typ-falsch', wo: 'Bei diesem Vergleich' });
    }
  }

  private pruefeBelegt(info: VarInfo, pos: Pos): void {
    if (info.art !== 'lokal' || this.tot || this.belegt.has(info)) return;
    this.fehler(
      'variable-nicht-initialisiert',
      pos,
      `Die Variable \`${info.name}\` hat hier vielleicht noch keinen Wert: Sie wurde in Zeile ${info.zeile} nur angelegt. Gib ihr dort gleich einen Startwert, z.B. \`${info.typ} ${info.name} = ${info.typ === 'int' ? '0' : 'false'};\`.`,
      {
        javac: `variable ${info.name} might not have been initialized`,
        tipp: 'Gib jeder Variablen direkt beim Anlegen einen Startwert.',
      },
    );
    // Einmal melden genügt.
    this.belegt.add(info);
  }

  private varTyp(a: Var): ATyp {
    const info = a.mitThis ? this.attribute.get(a.name) : this.finde(a.name);
    if (info) {
      this.pruefeBelegt(info, a.pos);
      return info.typ;
    }
    return this.variableUnbekannt(a.name, a.pos, a.mitThis === true);
  }

  /** Sucht eine Variable für Inkrement; meldet, wenn es sie nicht gibt. */
  private variable(name: string, pos: Pos, mitThis: boolean): VarInfo | undefined {
    const info = mitThis ? this.attribute.get(name) : this.finde(name);
    if (info) {
      this.pruefeBelegt(info, pos);
      return info;
    }
    this.variableUnbekannt(name, { ...pos, bis: pos.von + name.length, endZeile: pos.zeile }, mitThis);
    return undefined;
  }

  private variableUnbekannt(
    name: string,
    pos: Pos,
    mitThis: boolean,
    kontext?: { zuweisung: Zuweisung; typ: ATyp; selbstbezug: boolean },
  ): ATyp {
    const javac = `cannot find symbol\n  symbol:   variable ${name}`;
    if (this.unbekannte.has(name)) {
      this.unterdrueckt++;
      return 'unbekannt';
    }
    if (!kontext && !mitThis) {
      const eigene = this.eigene.get(name)?.find((m) => m.parameter.length === 0);
      const eingebaut = findeEingebaut(name);
      const rueckgabe: Typ | undefined = eigene ? eigene.rueckgabe : eingebaut && eingebaut.parameter.length === 0 ? eingebaut.rueckgabe : undefined;
      if (rueckgabe) {
        this.fehler(
          'klammer-rund-fehlt',
          pos,
          `\`${name}\` ist eine Methode. Beim Aufruf gehören immer runde Klammern dahinter: \`${name}()\`. Ohne Klammern sucht Java nach einer Variablen mit diesem Namen.`,
          {
            javac,
            tipp: 'Hinter jedem Methodennamen stehen runde Klammern – auch wenn nichts darin steht.',
            reparatur: { von: pos.bis, bis: pos.bis, ersatz: '()' },
          },
        );
        if (eingebaut && !eigene) this.nutztEingebaute = true;
        return rueckgabe;
      }
    }

    const vergangen = this.vergangen.get(name);
    if (vergangen !== undefined && !mitThis) {
      this.unbekannte.add(name);
      this.fehler(
        'variable-unbekannt',
        pos,
        `Die Variable \`${name}\` gibt es an dieser Stelle nicht mehr: Sie wurde in Zeile ${vergangen} innerhalb eines Blocks (oder im Kopf einer for-Schleife) angelegt und gilt nur bis zu dessen Ende. Lege sie weiter außen an, wenn du sie hier noch brauchst.`,
        { javac, tipp: 'Eine Variable gilt nur in dem Block `{ … }`, in dem sie angelegt wurde.' },
      );
      return 'unbekannt';
    }

    const v = aehnliche(name, this.sichtbareNamen());
    if (v) {
      const liste = v.namen.map((n) => `\`${n}\``).join(' oder ');
      this.fehler(
        'variable-unbekannt',
        pos,
        `Die Variable \`${name}\` gibt es nicht. Meintest du ${liste}?${v.nurSchreibweise ? ' Java unterscheidet Groß- und Kleinschreibung.' : ''}`,
        {
          javac,
          tipp: 'Schreibe Variablennamen immer genau so wie bei der Deklaration.',
          ...(v.namen.length === 1 ? { reparatur: { von: pos.von, bis: pos.von + name.length, ersatz: v.namen[0] } } : {}),
        },
      );
      return 'unbekannt';
    }

    if (mitThis) {
      this.fehler('variable-unbekannt', pos, `Ein Attribut namens \`${name}\` gibt es in dieser Klasse nicht.`, { javac });
      return 'unbekannt';
    }

    // Vertipper oben bleiben einzeln gemeldet (jeder hat seine Reparatur); alles ohne Reparatur nur einmal je Methode.
    this.unbekannte.add(name);
    const z = kontext && !kontext.selbstbezug ? kontext.zuweisung : undefined;
    const neuerTyp = kontext && (kontext.typ === 'int' || kontext.typ === 'boolean') ? kontext.typ : null;
    this.fehler(
      'variable-unbekannt',
      pos,
      z
        ? `Die Variable \`${name}\` wurde noch nicht angelegt. Beim ersten Mal gehört der Typ davor${neuerTyp ? `: \`${neuerTyp} ${this.text(z.pos)}\`` : ', z.B. `int` oder `boolean`'}.`
        : `Die Variable \`${name}\` wurde nirgends angelegt. Bevor du sie benutzt, musst du sie mit Typ und Startwert anlegen, z.B. \`int ${name} = 0;\`.`,
      {
        javac,
        tipp: 'Jede Variable wird genau einmal mit Typ angelegt (`int zaehler = 0;`), bevor sie benutzt wird.',
        ...(z && neuerTyp && z.op === '=' ? { reparatur: { von: z.pos.von, bis: z.pos.von, ersatz: `${neuerTyp} ` } } : {}),
      },
    );
    return 'unbekannt';
  }

  private aufruf(a: Aufruf): ATyp {
    const argTypen = a.argumente.map((arg) => this.typ(arg));
    const eigeneListe = this.eigene.get(a.name);
    let parameter: { name: string; typ: WertTyp }[];
    let rueckgabe: Typ;

    if (eigeneListe) {
      const m = eigeneListe.find((x) => x.parameter.length === a.argumente.length) ?? eigeneListe[0];
      parameter = m.parameter;
      rueckgabe = m.rueckgabe;
    } else {
      const e: Eingebaut | undefined = findeEingebaut(a.name);
      if (!e) {
        this.methodeUnbekannt(a);
        return 'unbekannt';
      }
      this.nutztEingebaute = true;
      parameter = e.parameter;
      rueckgabe = e.rueckgabe;
    }

    if (parameter.length !== a.argumente.length) {
      const sig = this.signatur(a.name, parameter);
      const erwartet =
        parameter.length === 0
          ? 'keine Werte in den Klammern'
          : parameter.length === 1
            ? `genau einen Wert in den Klammern (\`${parameter[0].typ} ${parameter[0].name}\`)`
            : `genau ${parameter.length} Werte in den Klammern`;
      const gegeben = a.argumente.length === 0 ? 'keinen' : a.argumente.length === 1 ? 'einen' : String(a.argumente.length);
      this.fehler('argumente-anzahl', a.pos, `\`${sig}\` erwartet ${erwartet}, du übergibst aber ${gegeben}.`, {
        javac: `method ${a.name} in class ${eigeneListe ? this.programm.klasse.name : 'Spinne'} cannot be applied to given types;`,
        tipp: 'Beim Aufruf stehen in den Klammern genau so viele Werte, wie die Methode im Kopf Parameter hat.',
      });
      return rueckgabe;
    }
    a.argumente.forEach((arg, i) => {
      this.erwarte(arg, argTypen[i], {
        soll: parameter[i].typ,
        code: 'typ-falsch',
        wo: `Für den Parameter \`${parameter[i].name}\` von \`${a.name}\``,
      });
    });
    return rueckgabe;
  }

  private methodeUnbekannt(a: Aufruf): void {
    const javac = `cannot find symbol\n  symbol:   method ${a.name}(${a.argumente.map(() => '…').join(',')})\n  location: class ${this.programm.klasse.name}`;
    if (GREENFOOT_FREMD.includes(a.name)) {
      this.melde({
        code: 'nicht-unterstuetzt',
        schwere: 'nicht-unterstuetzt',
        pos: a.namePos,
        text: `Das kann die App nicht ausführen: \`${a.name}()\` ist eine Greenfoot-Methode, die es in der Spinnenwelt der App nicht gibt. Die Spinne bewegst du mit \`schritt()\`, \`linksDrehen()\` und \`rechtsDrehen()\`.`,
      });
      return;
    }
    if (this.finde(a.name)) {
      this.fehler('methode-unbekannt', a.namePos, `\`${a.name}\` ist eine Variable, keine Methode. Lass die runden Klammern dahinter weg.`, { javac });
      return;
    }
    const v = aehnliche(a.name, this.alleMethodennamen());
    if (!v) {
      this.fehler(
        'methode-unbekannt',
        a.namePos,
        `Die Methode \`${a.name}()\` gibt es nicht – weder in der Klasse Spinne noch in deiner Klasse. Wolltest du sie selbst schreiben, fehlt noch ihre Deklaration: \`public void ${a.name}() { … }\`.`,
        { javac, tipp: TIPP_NAMEN },
      );
      return;
    }
    const liste = v.namen.map((n) => `\`${n}()\``).join(' oder ');
    this.fehler(
      'methode-unbekannt',
      a.namePos,
      `Die Methode \`${a.name}()\` gibt es nicht. Meintest du ${liste}?${v.nurSchreibweise ? ' Java unterscheidet Groß- und Kleinschreibung.' : ''}`,
      {
        javac,
        tipp: TIPP_NAMEN,
        ...(v.namen.length === 1 ? { reparatur: { von: a.namePos.von, bis: a.namePos.bis, ersatz: v.namen[0] } } : {}),
      },
    );
  }
}
