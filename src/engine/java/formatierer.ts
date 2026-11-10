// Gibt ein Programm im Allman-Stil aus: Konstrukt, `{` und `}` stehen auf einer Höhe,
// der Inhalt ist vier Leerzeichen eingerückt. Kommentare bleiben an ihrer Stelle erhalten.

import type { Anweisung, Ausdruck, Block, Kommentar, Konstruktor, Methode, Mitglied, Pos, Programm } from './ast';

const STUFE = '    ';

function ausdruck(a: Ausdruck): string {
  switch (a.art) {
    case 'Zahl':
      return String(a.wert);
    case 'Wahrheit':
      return a.wert ? 'true' : 'false';
    case 'Var':
      return a.mitThis ? `this.${a.name}` : a.name;
    case 'Aufruf':
      return `${a.mitThis ? 'this.' : ''}${a.name}(${a.argumente.map(ausdruck).join(', ')})`;
    case 'Unaer': {
      const operand = ausdruck(a.operand);
      // `- -x` darf nicht zu `--x` zusammenwachsen.
      return a.op === '-' && operand.startsWith('-') ? `- ${operand}` : `${a.op}${operand}`;
    }
    case 'Binaer':
      return `${ausdruck(a.links)} ${a.op} ${ausdruck(a.rechts)}`;
    case 'Klammer':
      return `(${ausdruck(a.inhalt)})`;
    case 'Luecke':
      return '/* ? */';
  }
}

/** Einfache Anweisung ohne abschließendes Semikolon (so steht sie auch im for-Kopf). */
function einfach(a: Anweisung): string {
  switch (a.art) {
    case 'VarDekl':
      return a.wert ? `${a.typ} ${a.name} = ${ausdruck(a.wert)}` : `${a.typ} ${a.name}`;
    case 'Zuweisung':
      return `${a.mitThis ? 'this.' : ''}${a.name} ${a.op} ${ausdruck(a.wert)}`;
    case 'Inkrement':
      return a.praefix ? `${a.op}${a.name}` : `${a.name}${a.op}`;
    case 'AufrufAnw':
      return ausdruck(a.aufruf);
    case 'Rueckgabe':
      return a.wert ? `return ${ausdruck(a.wert)}` : 'return';
    default:
      return '/* ? */';
  }
}

class Drucker {
  private readonly zeilen: string[] = [];
  private readonly kommentare: Kommentar[];
  private k = 0;

  constructor(private readonly programm: Programm) {
    this.kommentare = [...programm.kommentare].sort((a, b) => a.pos.von - b.pos.von);
  }

  private kommentarZeilen(kommentar: Kommentar, einzug: string): void {
    const teile = kommentar.text.split(/\r?\n/);
    this.zeilen.push(einzug + teile[0].trimEnd());
    for (const teil of teile.slice(1)) {
      const t = teil.trim();
      this.zeilen.push(t.startsWith('*') ? `${einzug} ${t}` : einzug + t);
    }
  }

  /** Gibt alle Kommentare aus, die im Quelltext vor `von` stehen. */
  private kommentareVor(von: number, einzug: string): void {
    while (this.k < this.kommentare.length && this.kommentare[this.k].pos.von < von) {
      this.kommentarZeilen(this.kommentare[this.k++], einzug);
    }
  }

  /** Hängt einen Kommentar, der im Original hinter der Anweisung in derselben Zeile stand, wieder dort an. */
  private kommentarDahinter(pos: Pos): void {
    const naechster = this.kommentare[this.k];
    if (!naechster || naechster.pos.zeile !== pos.endZeile || naechster.pos.von < pos.bis) return;
    if (naechster.pos.endZeile !== naechster.pos.zeile) return;
    this.zeilen[this.zeilen.length - 1] += `  ${naechster.text.trimEnd()}`;
    this.k++;
  }

  private zeile(text: string, einzug: string, pos: Pos): void {
    this.zeilen.push(einzug + text);
    this.kommentarDahinter(pos);
  }

  private blockInhalt(b: Block, einzug: string): void {
    this.zeilen.push(`${einzug}{`);
    for (const a of b.anweisungen) this.anweisung(a, einzug + STUFE);
    this.kommentareVor(b.pos.bis - 1, einzug + STUFE);
    this.zeilen.push(`${einzug}}`);
  }

  /** Rumpf von if/else/while/for/do: Block auf gleicher Höhe, einzelne Anweisung eingerückt. */
  private rumpf(a: Anweisung, einzug: string): void {
    if (a.art === 'Block') this.blockInhalt(a, einzug);
    else if (a.art === 'Leer') this.zeilen[this.zeilen.length - 1] += ';';
    else this.anweisung(a, einzug + STUFE);
  }

  private wenn(a: Extract<Anweisung, { art: 'Wenn' }>, einzug: string, praefix: string): void {
    this.zeilen.push(`${einzug}${praefix}if (${ausdruck(a.bedingung)})`);
    this.rumpf(a.dann, einzug);
    if (!a.sonst) return;
    if (a.sonst.art === 'Wenn') {
      this.kommentareVor(a.sonst.pos.von, einzug);
      this.wenn(a.sonst, einzug, 'else ');
    } else {
      this.zeilen.push(`${einzug}else`);
      this.rumpf(a.sonst, einzug);
    }
  }

  private anweisung(a: Anweisung, einzug: string): void {
    this.kommentareVor(a.pos.von, einzug);
    switch (a.art) {
      case 'Block':
        this.blockInhalt(a, einzug);
        return;
      case 'Leer':
        this.zeile(';', einzug, a.pos);
        return;
      case 'Luecke':
        this.zeile('/* ? */', einzug, a.pos);
        return;
      case 'Wenn':
        this.wenn(a, einzug, '');
        return;
      case 'Solange':
        this.zeilen.push(`${einzug}while (${ausdruck(a.bedingung)})`);
        this.rumpf(a.rumpf, einzug);
        return;
      case 'Wiederhole':
        this.zeilen.push(`${einzug}do`);
        this.rumpf(a.rumpf, einzug);
        this.zeile(`while (${ausdruck(a.bedingung)});`, einzug, a.pos);
        return;
      case 'Zaehl': {
        const init = a.init ? einfach(a.init) : '';
        const bedingung = a.bedingung ? ` ${ausdruck(a.bedingung)}` : '';
        const schritt = a.schritt ? ` ${einfach(a.schritt)}` : '';
        this.zeilen.push(`${einzug}for (${init};${bedingung};${schritt})`);
        this.rumpf(a.rumpf, einzug);
        return;
      }
      default:
        this.zeile(`${einfach(a)};`, einzug, a.pos);
    }
  }

  private methode(m: Methode | Konstruktor, einzug: string): void {
    const sicht = m.sicht ? `${m.sicht} ` : '';
    const rueckgabe = m.art === 'Methode' ? `${m.rueckgabe} ` : '';
    const parameter = m.parameter.map((p) => `${p.typ} ${p.name}`).join(', ');
    this.zeilen.push(`${einzug}${sicht}${rueckgabe}${m.name}(${parameter})`);
    this.blockInhalt(m.rumpf, einzug);
  }

  private mitglieder(mitglieder: Mitglied[], einzug: string): void {
    let vorher: Mitglied | null = null;
    for (const m of mitglieder) {
      // Attribute stehen als Gruppe zusammen, Methoden werden durch eine Leerzeile getrennt.
      if (vorher && !(vorher.art === 'Feld' && m.art === 'Feld')) this.zeilen.push('');
      this.kommentareVor(m.pos.von, einzug);
      if (m.art === 'Feld') {
        const sicht = m.sicht ? `${m.sicht} ` : '';
        const wert = m.wert ? ` = ${ausdruck(m.wert)}` : '';
        this.zeile(`${sicht}${m.typ} ${m.name}${wert};`, einzug, m.pos);
      } else {
        this.methode(m, einzug);
      }
      vorher = m;
    }
  }

  alles(): string {
    const p = this.programm;
    for (const i of p.importe) {
      this.kommentareVor(i.pos.von, '');
      this.zeile(`import ${i.name};`, '', i.pos);
    }
    if (p.nurMethoden) {
      if (p.importe.length > 0 && p.klasse.mitglieder.length > 0) this.zeilen.push('');
      this.mitglieder(p.klasse.mitglieder, '');
    } else {
      const k = p.klasse;
      if (p.importe.length > 0) this.zeilen.push('');
      this.kommentareVor(k.pos.von, '');
      this.zeilen.push(`public class ${k.name}${k.oberklasse ? ` extends ${k.oberklasse}` : ''}`);
      this.zeilen.push('{');
      this.mitglieder(k.mitglieder, STUFE);
      this.kommentareVor(k.pos.bis - 1, STUFE);
      this.zeilen.push('}');
    }
    this.kommentareVor(Number.POSITIVE_INFINITY, '');
    return `${this.zeilen.join('\n')}\n`;
  }
}

/** Einheitliche Darstellung im Allman-Stil mit vier Leerzeichen je Stufe. */
export function formatiere(programm: Programm): string {
  return new Drucker(programm).alles();
}
