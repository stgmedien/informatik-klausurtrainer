// Syntaxbaum des Schul-Java-Subsets und die Form der Diagnosen.

/** zeile/spalte 1-basiert, von/bis Zeichenoffsets im Originalquelltext (bis exklusiv). */
export interface Pos {
  von: number;
  bis: number;
  zeile: number;
  spalte: number;
  endZeile: number;
}

export type Typ = 'int' | 'boolean' | 'void';
export type WertTyp = 'int' | 'boolean';
export type Sicht = 'public' | 'private';

interface Basis {
  id: number;
  pos: Pos;
}

export interface Kommentar {
  art: 'zeile' | 'block' | 'doc';
  text: string;
  pos: Pos;
}

// ---------- Ausdrücke ----------

export interface Zahl extends Basis {
  art: 'Zahl';
  wert: number;
}
export interface Wahrheit extends Basis {
  art: 'Wahrheit';
  wert: boolean;
}
export interface Var extends Basis {
  art: 'Var';
  name: string;
  /** true bei `this.name`: meint immer das Attribut. */
  mitThis?: boolean;
}
export interface Aufruf extends Basis {
  art: 'Aufruf';
  name: string;
  argumente: Ausdruck[];
  mitThis: boolean;
  /** Position des Methodennamens (für Markierung und Reparatur). */
  namePos: Pos;
}
export interface Unaer extends Basis {
  art: 'Unaer';
  op: '!' | '-';
  operand: Ausdruck;
}
export type BinaerOp = '||' | '&&' | '|' | '&' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '+' | '-' | '*' | '/' | '%';
export interface Binaer extends Basis {
  art: 'Binaer';
  op: BinaerOp;
  links: Ausdruck;
  rechts: Ausdruck;
}
export interface Klammer extends Basis {
  art: 'Klammer';
  inhalt: Ausdruck;
}
/**
 * Platzhalter für etwas, das der Parser nicht verstanden hat oder die App nicht ausführen kann.
 * Kommt nur im `entwurf` vor – zu jeder Lücke gibt es eine Diagnose, `programm` ist dann null.
 */
export interface Luecke extends Basis {
  art: 'Luecke';
}

export type Ausdruck = Zahl | Wahrheit | Var | Aufruf | Unaer | Binaer | Klammer | Luecke;

// ---------- Anweisungen ----------

export interface Block extends Basis {
  art: 'Block';
  anweisungen: Anweisung[];
}
export interface Leer extends Basis {
  art: 'Leer';
}
export interface VarDekl extends Basis {
  art: 'VarDekl';
  typ: WertTyp;
  name: string;
  wert?: Ausdruck;
}
export interface Zuweisung extends Basis {
  art: 'Zuweisung';
  name: string;
  op: '=' | '+=' | '-=';
  wert: Ausdruck;
  mitThis?: boolean;
}
export interface Inkrement extends Basis {
  art: 'Inkrement';
  name: string;
  op: '++' | '--';
  praefix: boolean;
}
export interface AufrufAnw extends Basis {
  art: 'AufrufAnw';
  aufruf: Aufruf;
}
export interface Wenn extends Basis {
  art: 'Wenn';
  bedingung: Ausdruck;
  dann: Anweisung;
  sonst?: Anweisung;
}
export interface Solange extends Basis {
  art: 'Solange';
  bedingung: Ausdruck;
  rumpf: Anweisung;
}
export interface Wiederhole extends Basis {
  art: 'Wiederhole';
  rumpf: Anweisung;
  bedingung: Ausdruck;
}
export type Einfach = Zuweisung | Inkrement | AufrufAnw;
export interface Zaehl extends Basis {
  art: 'Zaehl';
  init?: VarDekl | Einfach;
  bedingung?: Ausdruck;
  schritt?: Einfach;
  rumpf: Anweisung;
}
export interface Rueckgabe extends Basis {
  art: 'Rueckgabe';
  wert?: Ausdruck;
}

export type Anweisung =
  | Block
  | Leer
  | VarDekl
  | Zuweisung
  | Inkrement
  | AufrufAnw
  | Wenn
  | Solange
  | Wiederhole
  | Zaehl
  | Rueckgabe
  | Luecke;

// ---------- Klasse ----------

export interface Import extends Basis {
  art: 'Import';
  name: string;
}
export interface Parameter extends Basis {
  art: 'Parameter';
  typ: WertTyp;
  name: string;
}
/** Attribut der Klasse. */
export interface FeldDekl extends Basis {
  art: 'Feld';
  sicht?: Sicht;
  typ: WertTyp;
  name: string;
  wert?: Ausdruck;
}
export interface Konstruktor extends Basis {
  art: 'Konstruktor';
  sicht?: Sicht;
  name: string;
  parameter: Parameter[];
  rumpf: Block;
  /** Methodenkopf von der Sichtbarkeit bis zur schließenden runden Klammer. */
  kopf: Pos;
}
export interface Methode extends Basis {
  art: 'Methode';
  sicht?: Sicht;
  rueckgabe: Typ;
  name: string;
  parameter: Parameter[];
  rumpf: Block;
  kopf: Pos;
}
export type Mitglied = FeldDekl | Konstruktor | Methode;

export interface Klasse extends Basis {
  art: 'Klasse';
  name: string;
  oberklasse?: string;
  /** Alle Mitglieder in Quelltextreihenfolge. */
  mitglieder: Mitglied[];
  felder: FeldDekl[];
  konstruktoren: Konstruktor[];
  methoden: Methode[];
}

export interface Programm extends Basis {
  art: 'Programm';
  importe: Import[];
  klasse: Klasse;
  kommentare: Kommentar[];
  quelltext: string;
  knoten: Map<number, Knoten>;
  /** true, wenn der Quelltext nur aus Methoden bestand und der Klassenrahmen gedacht ist. */
  nurMethoden: boolean;
}

export type Knoten = Programm | Klasse | Import | Parameter | Mitglied | Anweisung | Ausdruck;

// ---------- Diagnosen ----------

export type Schwere = 'fehler' | 'warnung' | 'stil' | 'nicht-unterstuetzt';

export interface Diagnose {
  /** Stabiler Schlüssel, z.B. 'semikolon-fehlt'. */
  code: string;
  schwere: Schwere;
  pos: Pos;
  /** Deutsch, an Schüler gerichtet: was ist falsch und wo. */
  text: string;
  /** Originalwortlaut des Java-Compilers. */
  javac?: string;
  /** Wie man den Fehler auf Papier vermeidet. */
  tipp?: string;
  reparatur?: { von: number; bis: number; ersatz: string };
  folgefehler?: boolean;
}
