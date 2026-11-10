import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatiere, fuehreAus, parse, pruefeEinrueckung, wendeReparaturenAn, type Schwere } from '../../src/engine/java';
import { endzustand, parseWelt } from '../../src/engine/welt';

/** Klassenrahmen: der Rumpf beginnt in Zeile 3. */
const K = (rumpf: string): string => `public class Tarantel extends Spinne\n{\n${rumpf}\n}\n`;
/** Methode `test` im Klassenrahmen: die Anweisungen beginnen in Zeile 5. */
const M = (...zeilen: string[]): string => K(`    public void test()\n    {\n${zeilen.map((z) => `        ${z}`).join('\n')}\n    }`);

interface Fall {
  name: string;
  code: string;
  quelle: string;
  zeile: number;
  schwere?: Schwere;
  /** true: Die Diagnose muss eine Reparatur tragen; false: sie darf keine haben. */
  reparatur: boolean;
  javac?: string;
  text?: RegExp;
  nurMethoden?: boolean;
}

const FAELLE: Fall[] = [
  // ----- Lexer -----
  {
    name: 'Kommentar wird nicht geschlossen',
    code: 'kommentar-offen',
    quelle: K('    public void a()\n    {\n        /* offen\n        schritt();\n    }'),
    zeile: 5,
    reparatur: false,
    javac: 'unterminated comment',
  },
  { name: 'Anführungszeichen wird nicht geschlossen', code: 'text-offen', quelle: M('fliegenFuettern("3);'), zeile: 5, reparatur: false },
  { name: 'fremdes Zeichen', code: 'zeichen-unbekannt', quelle: M('schritt();§'), zeile: 5, reparatur: true, javac: "illegal character: '\\u00a7'" },
  {
    name: 'While großgeschrieben',
    code: 'schluesselwort-gross',
    quelle: M('While (hindernisVorn())', '{', '    linksDrehen();', '}'),
    zeile: 5,
    reparatur: true,
    text: /`while` wird in Java komplett kleingeschrieben/,
  },
  {
    name: 'Public Void großgeschrieben',
    code: 'schluesselwort-gross',
    quelle: K('    Public Void test()\n    {\n        If (fliegeAmPlatz()) { fliegeFressen(); } Else { schritt(); }\n    }'),
    zeile: 3,
    reparatur: true,
  },

  // ----- Parser: Aufbau -----
  {
    name: 'Methoden ohne Klassenrahmen',
    code: 'klasse-fehlt',
    quelle: 'public void a()\n{\n    schritt();\n}\n',
    zeile: 1,
    reparatur: false,
    javac: 'class, interface, enum, or record expected',
  },
  { name: 'leerer Quelltext', code: 'klasse-fehlt', quelle: '  \n', zeile: 2, reparatur: false },
  { name: 'Methodenname fehlt', code: 'bezeichner-erwartet', quelle: K('    public void ()\n    {\n    }'), zeile: 3, reparatur: false },
  {
    name: 'Methode nicht geschlossen, dann public',
    code: 'klammer-geschweift',
    quelle: K('    public void a()\n    {\n        schritt();\n\n    public void b()\n    {\n        schritt();\n    }'),
    zeile: 7,
    reparatur: true,
    text: /Die Methode `a` aus Zeile 3 ist noch nicht geschlossen/,
    javac: 'illegal start of expression',
  },
  {
    name: 'Schleifenblock und Methode nicht geschlossen, dann private',
    code: 'klammer-geschweift',
    quelle: K(
      '    public void a()\n    {\n        while (hindernisVorn())\n        {\n            linksDrehen();\n\n    private void b()\n    {\n        schritt();\n    }',
    ),
    zeile: 9,
    reparatur: true,
    text: /fehlen 2 schließende geschweifte Klammern.*`while`-Block \(Zeile 5\).*Methode `a` \(Zeile 3\)/,
  },
  {
    name: 'am Dateiende fehlt }',
    code: 'klammer-geschweift',
    quelle: 'public class Tarantel extends Spinne\n{\n    public void a()\n    {\n        schritt();\n    }\n',
    zeile: 6,
    reparatur: true,
    javac: 'reached end of file while parsing',
  },
  {
    name: '} zu viel am Ende',
    code: 'klammer-geschweift',
    quelle: `${K('    public void a()\n    {\n        schritt();\n    }')}}\n`,
    zeile: 8,
    reparatur: true,
    text: /ist zu viel/,
  },
  {
    name: '} zu viel in der Mitte',
    code: 'klammer-geschweift',
    quelle: K('    public void a()\n    {\n        schritt();\n    }\n    }\n    public void b()\n    {\n    }'),
    zeile: 8,
    reparatur: true,
    text: /schon in Zeile 7 mit `}` geschlossen/,
  },
  {
    name: '} vor else fehlt',
    code: 'klammer-geschweift',
    quelle: M('if (hindernisVorn())', '{', '    linksDrehen();', 'else', '{', '    schritt();', '}'),
    zeile: 8,
    reparatur: true,
    text: /Vor `else` fehlt die schließende geschweifte Klammer `}` des `if`-Blocks aus Zeile 5/,
  },
  {
    name: '{ nach Klassenkopf fehlt',
    code: 'klammer-geschweift',
    quelle: 'public class Tarantel extends Spinne\n    public void a()\n    {\n        schritt();\n    }\n}\n',
    zeile: 1,
    reparatur: true,
  },
  { name: '{ nach Methodenkopf fehlt', code: 'klammer-geschweift', quelle: K('    public void a()\n        schritt();\n    }'), zeile: 3, reparatur: true },
  {
    name: '; nach Methodenkopf',
    code: 'semikolon-nach-methodenkopf',
    quelle: K('    public void test();\n    {\n        schritt();\n    }'),
    zeile: 3,
    reparatur: true,
    javac: 'missing method body, or declare abstract',
  },
  { name: 'Methode ohne Rumpf', code: 'methodenrumpf-fehlt', quelle: K('    public void a();'), zeile: 3, reparatur: false },
  {
    name: 'Rückgabetyp fehlt',
    code: 'rueckgabetyp-fehlt',
    quelle: K('    public test()\n    {\n        schritt();\n    }'),
    zeile: 3,
    reparatur: true,
    javac: 'invalid method declaration; return type required',
  },
  { name: 'publik statt public', code: 'schluesselwort-falsch', quelle: K('    publik void a()\n    {\n    }'), zeile: 3, reparatur: true },
  { name: 'integer statt int', code: 'typ-unbekannt', quelle: M('integer x = 3;', 'bool b = true;'), zeile: 5, reparatur: true },
  { name: 'Parameter ohne Typ', code: 'parameter-typ-fehlt', quelle: K('    public void a(anzahl)\n    {\n    }'), zeile: 3, reparatur: true },
  { name: 'Komma zwischen Parametern fehlt', code: 'komma-fehlt', quelle: K('    public void a(int b int c)\n    {\n    }'), zeile: 3, reparatur: true },
  {
    name: 'Anweisung außerhalb einer Methode',
    code: 'anweisung-ausserhalb',
    quelle: K('    public void test()\n    {\n        schritt();\n    }\n        linksDrehen();\n    }\n    public void b()\n    {\n    }'),
    zeile: 7,
    reparatur: false,
    text: /Die Methode `test` davor endet schon in Zeile 6/,
  },

  // ----- Parser: Anweisungen -----
  {
    name: 'Semikolon fehlt',
    code: 'semikolon-fehlt',
    quelle: M('schritt()', 'linksDrehen();'),
    zeile: 5,
    reparatur: true,
    javac: "';' expected",
    text: /Nach `schritt\(\)` in Zeile 5 fehlt das Semikolon/,
  },
  { name: 'Semikolon fehlt nach Deklaration', code: 'semikolon-fehlt', quelle: M('int x = 3', 'x++;'), zeile: 5, reparatur: true },
  { name: 'Semikolon fehlt nach return', code: 'semikolon-fehlt', quelle: M('if (hindernisVorn())', '    return', 'schritt();'), zeile: 6, reparatur: true },
  { name: 'Semikolon fehlt vor }', code: 'semikolon-fehlt', quelle: M('if (hindernisVorn()) { linksDrehen() }'), zeile: 5, reparatur: true },
  { name: 'Semikolon fehlt nach import', code: 'semikolon-fehlt', quelle: `import greenfoot.*\n${M('schritt();')}`, zeile: 1, reparatur: true },
  { name: 'Semikolon fehlt nach Attribut', code: 'semikolon-fehlt', quelle: K('    private int z = 0\n    public void a()\n    {\n    }'), zeile: 3, reparatur: true },
  { name: 'Semikolon fehlt im for-Kopf', code: 'semikolon-fehlt', quelle: M('for (int i = 0 i < 3; i++)', '{', '    schritt();', '}'), zeile: 5, reparatur: true },
  { name: 'Doppelpunkt statt Semikolon', code: 'semikolon-fehlt', quelle: M('schritt():', 'schritt();'), zeile: 5, reparatur: true, text: /statt eines Semikolons/ },
  {
    name: '; nach while(...)',
    code: 'semikolon-nach-while',
    schwere: 'warnung',
    quelle: M('while (hindernisVorn());', '{', '    linksDrehen();', '}'),
    zeile: 5,
    reparatur: true,
    text: /endet die Schleife schon hier.*gehört nicht mehr zur Schleife.*endlos/,
  },
  {
    name: '; nach if(...)',
    code: 'semikolon-nach-if',
    schwere: 'warnung',
    quelle: M('if (hindernisVorn());', '{', '    linksDrehen();', '}'),
    zeile: 5,
    reparatur: true,
    text: /wird immer ausgeführt/,
  },
  {
    name: '; nach if(...) mit else dahinter ist ein Fehler',
    code: 'semikolon-nach-if',
    schwere: 'fehler',
    quelle: M('if (hindernisVorn());', '{', '    linksDrehen();', '}', 'else', '{', '    schritt();', '}'),
    zeile: 5,
    reparatur: true,
    javac: "'else' without 'if'",
  },
  {
    name: '; nach for(...)',
    code: 'semikolon-nach-for',
    schwere: 'warnung',
    quelle: M('for (int i = 0; i < 3; i++);', '{', '    schritt();', '}'),
    zeile: 5,
    reparatur: true,
    text: /genau einmal ausgeführt/,
  },
  {
    name: '; nach else',
    code: 'semikolon-nach-else',
    schwere: 'warnung',
    quelle: M('if (hindernisVorn())', '{', '    linksDrehen();', '}', 'else;', '{', '    schritt();', '}'),
    zeile: 9,
    reparatur: true,
  },
  {
    name: '; nach do-while fehlt',
    code: 'semikolon-nach-do-while-fehlt',
    quelle: M('do', '{', '    schritt();', '}', 'while (!hindernisVorn())', 'linksDrehen();'),
    zeile: 9,
    reparatur: true,
    javac: "';' expected",
  },
  { name: 'do ohne while', code: 'do-ohne-while', quelle: M('do', '{', '    schritt();', '}', 'schritt();'), zeile: 8, reparatur: false, javac: "'while' expected" },
  {
    name: 'else ohne if',
    code: 'else-ohne-if',
    quelle: M('schritt();', 'else', '{', '    linksDrehen();', '}'),
    zeile: 6,
    reparatur: false,
    javac: "'else' without 'if'",
  },
  {
    name: 'for mit Kommas',
    code: 'for-kommas',
    quelle: M('for (int i = 0, i < 3, i++)', '{', '    schritt();', '}'),
    zeile: 5,
    reparatur: true,
  },
  { name: 'for mit nur zwei Teilen', code: 'for-unvollstaendig', quelle: M('for (int i = 0; i < 3)', '{', '}'), zeile: 5, reparatur: true },
  { name: 'if ohne Rumpf', code: 'rumpf-fehlt', quelle: M('if (hindernisVorn())'), zeile: 5, reparatur: false },
  { name: 'while ohne Bedingung', code: 'bedingung-fehlt', quelle: M('while ()', '{', '    schritt();', '}'), zeile: 5, reparatur: false },
  {
    name: 'Bedingung in zwei Klammerpaaren',
    code: 'bedingung-klammern',
    quelle: M('if (hindernisVorn()) && (fliegeAmPlatz())', '{', '    schritt();', '}'),
    zeile: 5,
    reparatur: true,
  },

  // ----- Parser: runde Klammern -----
  {
    name: 'while ohne runde Klammern',
    code: 'klammer-rund-fehlt',
    quelle: M('while hindernisVorn()', '{', '    linksDrehen();', '}'),
    zeile: 5,
    reparatur: true,
    javac: "'(' expected",
  },
  { name: 'if ohne öffnende Klammer', code: 'klammer-rund-fehlt', quelle: M('if hindernisVorn())', '{', '    linksDrehen();', '}'), zeile: 5, reparatur: true },
  {
    name: 'schließende Klammer der Bedingung fehlt',
    code: 'klammer-rund-fehlt',
    quelle: M('while (hindernisVorn()', '{', '    linksDrehen();', '}'),
    zeile: 5,
    reparatur: true,
    javac: "')' expected",
  },
  { name: 'schließende Klammer im Aufruf fehlt', code: 'klammer-rund-fehlt', quelle: M('fliegenFuettern(3;'), zeile: 5, reparatur: true },
  {
    name: 'Methodenname als Anweisung ohne ()',
    code: 'klammer-rund-fehlt',
    quelle: M('schritt;', 'linksDrehen;'),
    zeile: 5,
    reparatur: true,
    javac: 'not a statement',
    text: /Nach dem Methodennamen `schritt` fehlen die runden Klammern/,
  },
  { name: 'Methodenkopf ohne ()', code: 'klammer-rund-fehlt', quelle: K('    public void test\n    {\n        schritt();\n    }'), zeile: 3, reparatur: true },
  {
    name: 'Methode ohne () in einer Bedingung',
    code: 'klammer-rund-fehlt',
    quelle: M('while (hindernisVorn)', '{', '    linksDrehen();', '}'),
    zeile: 5,
    reparatur: true,
    text: /`hindernisVorn` ist eine Methode/,
  },
  { name: ') zu viel', code: 'klammer-rund-zuviel', quelle: M('schritt());'), zeile: 5, reparatur: true },

  // ----- Parser: Ausdrücke -----
  {
    name: '= statt == in der Bedingung',
    code: 'zuweisung-statt-vergleich',
    quelle: M('int x = 3;', 'if (x = 3)', '{', '    schritt();', '}'),
    zeile: 6,
    reparatur: true,
    text: /zum Vergleichen brauchst du `==`/,
  },
  { name: '= statt == in while', code: 'zuweisung-statt-vergleich', quelle: M('int x = 3;', 'while (x = 0) { x++; }'), zeile: 6, reparatur: true },
  { name: '== statt = als Anweisung', code: 'vergleich-statt-zuweisung', quelle: M('int x = 0;', 'x == 5;'), zeile: 6, reparatur: true },
  { name: '=< statt <=', code: 'vergleich-verdreht', quelle: M('int i = 0;', 'while (i =< 3)', '{', '    i++;', '}'), zeile: 6, reparatur: true },
  {
    name: 'und / nicht statt && / !',
    code: 'wort-statt-operator',
    quelle: M('if (hindernisVorn() und nicht fliegeAmPlatz())', '{', '    schritt();', '}'),
    zeile: 5,
    reparatur: true,
  },
  {
    name: '& statt &&',
    code: 'und-oder-einfach',
    schwere: 'warnung',
    quelle: M('if (hindernisVorn() & hindernisLinks() | fliegeAmPlatz())', '{', '    schritt();', '}'),
    zeile: 5,
    reparatur: true,
  },
  { name: 'Zahl allein', code: 'keine-anweisung', quelle: M('5;'), zeile: 5, reparatur: false, javac: 'not a statement' },
  { name: 'Ausdruck als Anweisung', code: 'keine-anweisung', quelle: M('int x = 1;', 'x + 1;'), zeile: 6, reparatur: false },
  { name: 'Wert fehlt', code: 'ausdruck-erwartet', quelle: M('int x = ;'), zeile: 5, reparatur: false, javac: 'illegal start of expression' },
  { name: 'Zahl zu groß', code: 'zahl-zu-gross', quelle: M('int x = 3000000000;'), zeile: 5, reparatur: false, javac: 'integer number too large' },
  { name: 'Name beginnt mit Ziffer', code: 'zahl-ungueltig', quelle: M('int y = 3abc;'), zeile: 5, reparatur: false },
  { name: 'unpassendes Zeichen', code: 'unerwartet', quelle: M('* 5;'), zeile: 5, reparatur: false },

  // ----- Namens- und Typprüfung -----
  {
    name: 'Tippfehler im Methodennamen',
    code: 'methode-unbekannt',
    quelle: M('schrit();'),
    zeile: 5,
    reparatur: true,
    text: /Die Methode `schrit\(\)` gibt es nicht\. Meintest du `schritt\(\)`\?/,
    javac: 'cannot find symbol\n  symbol:   method schrit()\n  location: class Tarantel',
  },
  {
    name: 'falsche Groß-/Kleinschreibung',
    code: 'methode-unbekannt',
    quelle: M('LinksDrehen();'),
    zeile: 5,
    reparatur: true,
    text: /Meintest du `linksDrehen\(\)`\? Java unterscheidet Groß- und Kleinschreibung/,
  },
  {
    name: 'Tippfehler bei eigener Methode',
    code: 'methode-unbekannt',
    quelle: K('    public void test()\n    {\n        wendn();\n    }\n    private void wenden()\n    {\n        rechtsDrehen();\n        rechtsDrehen();\n    }'),
    zeile: 5,
    reparatur: true,
    text: /Meintest du `wenden\(\)`\?/,
  },
  { name: 'völlig unbekannte Methode', code: 'methode-unbekannt', quelle: M('huepfen();'), zeile: 5, reparatur: false, text: /weder in der Klasse Spinne noch in deiner Klasse/ },
  { name: 'Methode doppelt', code: 'methode-doppelt', quelle: K('    public void a()\n    {\n    }\n    public void a()\n    {\n    }'), zeile: 6, reparatur: false },
  {
    name: 'fliegenAmPlatz() als Bedingung',
    code: 'zwilling-verwechselt',
    quelle: M('if (fliegenAmPlatz())', '{', '    fliegeFressen();', '}'),
    zeile: 5,
    reparatur: true,
    text: /`fliegenAmPlatz\(\)` liefert eine Zahl.*Zwilling `fliegeAmPlatz\(\)`/,
    javac: 'incompatible types: int cannot be converted to boolean',
  },
  {
    name: 'fliegenGefressen() als Schleifenbedingung',
    code: 'zwilling-verwechselt',
    quelle: M('while (!fliegenGefressen())', '{', '    fliegeFressen();', '}'),
    zeile: 5,
    reparatur: true,
    text: /Zwilling `fliegeGefressen\(\)`/,
  },
  {
    name: 'fliegeGefressen() als Zahl',
    code: 'zwilling-verwechselt',
    quelle: M('while (fliegeGefressen() > 0)', '{', '    fliegeAusspucken();', '}'),
    zeile: 5,
    reparatur: true,
    text: /Zwilling `fliegenGefressen\(\)`/,
  },
  {
    name: 'void-Methode als Bedingung',
    code: 'typ-bedingung',
    quelle: M('while (schritt())', '{', '}'),
    zeile: 5,
    reparatur: false,
    text: /`schritt\(\)` ist eine Aktion/,
    javac: 'incompatible types: void cannot be converted to boolean',
  },
  { name: 'Zahl als Bedingung', code: 'typ-bedingung', quelle: M('int n = 3;', 'while (n)', '{', '    n--;', '}'), zeile: 6, reparatur: false, text: /z\.B\. `n > 0`/ },
  { name: 'falscher Typ bei der Deklaration', code: 'typ-falsch', quelle: M('int x = true;'), zeile: 5, reparatur: false, javac: 'incompatible types: boolean cannot be converted to int' },
  { name: 'Zahl und Wahrheitswert verglichen', code: 'typ-falsch', quelle: M('boolean b = true;', 'if (b == 5) { }'), zeile: 6, reparatur: false },
  {
    name: 'return fehlt',
    code: 'return-fehlt',
    quelle: K('    public boolean frei()\n    {\n        if (hindernisVorn())\n        {\n            return false;\n        }\n    }'),
    zeile: 9,
    reparatur: false,
    javac: 'missing return statement',
    text: /Ein `return` innerhalb von `if` oder einer Schleife reicht nicht/,
  },
  { name: 'return ohne Wert', code: 'return-ohne-wert', quelle: K('    public int a()\n    {\n        return;\n    }'), zeile: 5, reparatur: false },
  { name: 'Rückgabe in void-Methode', code: 'rueckgabe-in-void', quelle: M('return 5;'), zeile: 5, reparatur: false, javac: 'incompatible types: unexpected return value' },
  { name: 'Variable nie angelegt', code: 'variable-unbekannt', quelle: M('zaehler = zaehler + 1;'), zeile: 5, reparatur: false, javac: 'cannot find symbol\n  symbol:   variable zaehler' },
  { name: 'Variable ohne Typ angelegt', code: 'variable-unbekannt', quelle: M('neu = 5;', 'neu = neu + 1;'), zeile: 5, reparatur: true },
  { name: 'Tippfehler im Variablennamen', code: 'variable-unbekannt', quelle: M('int anzahl = 0;', 'anzal++;'), zeile: 6, reparatur: true, text: /Meintest du `anzahl`\?/ },
  {
    name: 'for-Variable nach der Schleife',
    code: 'variable-unbekannt',
    quelle: M('for (int i = 0; i < 3; i++)', '{', '    schritt();', '}', 'fliegenFuettern(i);'),
    zeile: 9,
    reparatur: false,
    text: /gibt es an dieser Stelle nicht mehr.*Zeile 5/,
  },
  { name: 'Variable doppelt', code: 'variable-doppelt', quelle: M('int i = 0;', 'int i = 1;'), zeile: 6, reparatur: true, javac: 'variable i is already defined in method test' },
  { name: 'Parameter und Variable gleich', code: 'variable-doppelt', quelle: K('    public void a(int n)\n    {\n        boolean n = true;\n    }'), zeile: 5, reparatur: false },
  {
    name: 'Variable ohne Startwert benutzt',
    code: 'variable-nicht-initialisiert',
    quelle: M('int z;', 'while (z < 3)', '{', '    z = z + 1;', '}'),
    zeile: 6,
    reparatur: false,
    javac: 'variable z might not have been initialized',
  },
  { name: 'zu viele Argumente', code: 'argumente-anzahl', quelle: M('schritt(3);'), zeile: 5, reparatur: false },
  { name: 'Argument fehlt', code: 'argumente-anzahl', quelle: M('fliegenFuettern();'), zeile: 5, reparatur: false, text: /erwartet genau einen Wert/ },
  { name: 'Anweisung nach return', code: 'unerreichbar', quelle: M('return;', 'schritt();'), zeile: 6, reparatur: false, javac: 'unreachable statement' },
  { name: 'Abfrage als Anweisung', code: 'ergebnis-unbenutzt', schwere: 'warnung', quelle: M('hindernisVorn();'), zeile: 5, reparatur: false },
  {
    name: 'eingebaute Methode überschrieben',
    code: 'eingebaut-ueberschrieben',
    schwere: 'warnung',
    quelle: K('    public void schritt()\n    {\n        linksDrehen();\n    }'),
    zeile: 3,
    reparatur: false,
  },
  {
    name: 'extends Spinne fehlt',
    code: 'extends-fehlt',
    quelle: 'public class Tarantel\n{\n    public void a()\n    {\n        schritt();\n    }\n}\n',
    zeile: 1,
    reparatur: true,
  },
];

describe('gezielte Diagnosen für Schülerfehler', () => {
  it.each(FAELLE)('$code: $name', (fall) => {
    const opt = { nurMethoden: fall.nurMethoden === true };
    const schwere = fall.schwere ?? 'fehler';
    const { diagnosen, programm, entwurf } = parse(fall.quelle, opt);
    const d = diagnosen.find((x) => x.code === fall.code);
    expect(d, `Codes: ${diagnosen.map((x) => x.code).join(', ')}`).toBeDefined();
    if (!d) return;

    expect(d.pos.zeile).toBe(fall.zeile);
    expect(d.schwere).toBe(schwere);
    expect(d.text.length).toBeGreaterThan(20);
    expect(d.pos.von).toBeLessThanOrEqual(d.pos.bis);
    expect(d.pos.bis).toBeLessThanOrEqual(fall.quelle.length);
    if (fall.text) expect(d.text).toMatch(fall.text);
    if (fall.javac) expect(d.javac).toBe(fall.javac);
    expect(d.reparatur !== undefined).toBe(fall.reparatur);

    if (schwere === 'fehler') expect(programm).toBeNull();
    else expect(programm).toBe(entwurf);

    if (d.reparatur) {
      const repariert = wendeReparaturenAn(fall.quelle, diagnosen, { schweren: ['fehler', 'warnung'] });
      expect(repariert).not.toBeNull();
      const neu = parse(repariert!, opt);
      expect(neu.diagnosen.map((x) => `${x.code}@${x.pos.zeile}`)).toEqual([]);
      expect(neu.programm).not.toBeNull();
    }
  });

  it('deckt jeden Diagnose-Code mit mindestens einem Beispiel ab', () => {
    const quelltexte = ['lexer', 'parser', 'pruefung', 'parse', 'einrueckung'].map((datei) =>
      readFileSync(fileURLToPath(new URL(`../../src/engine/java/${datei}.ts`, import.meta.url)), 'utf8'),
    );
    const codes = new Set<string>();
    for (const q of quelltexte) {
      for (const m of q.matchAll(/code: '([a-z-]+)'/g)) codes.add(m[1]);
      for (const m of q.matchAll(/(?:fehler|warnung)\(\s*'([a-z-]+)'/g)) codes.add(m[1]);
    }
    codes.add('semikolon-nach-while').add('semikolon-nach-if').add('semikolon-nach-for').add('semikolon-nach-else');
    const getestet = new Set([...FAELLE.map((f) => f.code), 'nicht-unterstuetzt', 'zu-verschachtelt', 'einrueckung']);
    expect([...codes].filter((c) => !getestet.has(c)).sort()).toEqual([]);
    expect(codes.size).toBeGreaterThan(50);
  });
});

describe('Lage und Reihenfolge der Meldungen', () => {
  it('ein fehlendes Semikolon wird am Ende des vorigen Tokens markiert, nicht in der nächsten Zeile', () => {
    const quelle = M('schritt()', '', '', 'linksDrehen();');
    const d = parse(quelle).diagnosen[0];
    expect(d.code).toBe('semikolon-fehlt');
    expect(d.pos).toMatchObject({ zeile: 5, endZeile: 5, spalte: 17 });
    expect(quelle.slice(d.pos.von, d.pos.bis)).toBe(')');
    expect(d.reparatur).toEqual({ von: d.pos.bis, bis: d.pos.bis, ersatz: ';' });
    expect(d.tipp).toBeTruthy();
  });

  it('liefert Lexer-, Parser- und Prüfmeldungen gemeinsam und nach Position sortiert', () => {
    const quelle = M('Int x = 3', 'schrit();', 'if (fliegenAmPlatz()) { }', 'while (x = 3) { }');
    const { diagnosen } = parse(quelle);
    expect(diagnosen.map((d) => d.code)).toEqual(['schluesselwort-gross', 'semikolon-fehlt', 'methode-unbekannt', 'zwilling-verwechselt', 'zuweisung-statt-vergleich']);
    const offsets = diagnosen.map((d) => d.pos.von);
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b));
    const repariert = wendeReparaturenAn(quelle, diagnosen)!;
    expect(parse(repariert).diagnosen).toEqual([]);
    expect(repariert).toContain('int x = 3;\n        schritt();\n        if (fliegeAmPlatz()) { }\n        while (x == 3) { }');
  });

  it('höchstens fünf echte Fehlermeldungen, weitere sind als Folgefehler markiert', () => {
    const quelle = M(...Array.from({ length: 8 }, (_, i) => `unbekannt${i}();`), 'while (hindernisVorn());', '{', '}');
    const { diagnosen } = parse(quelle);
    const fehler = diagnosen.filter((d) => d.schwere === 'fehler');
    expect(fehler).toHaveLength(8);
    expect(fehler.map((d) => d.folgefehler === true)).toEqual([false, false, false, false, false, true, true, true]);
    // Warnungen zählen nicht mit und werden nie zum Folgefehler.
    const warnung = diagnosen.find((d) => d.schwere === 'warnung')!;
    expect(warnung.code).toBe('semikolon-nach-while');
    expect(warnung.folgefehler).toBeUndefined();
  });

  it('nach einem groben Syntaxfehler gibt es keine Namens- oder Typmeldungen aus dem lückenhaften Baum', () => {
    const quelle = K('    public void a()\n    {\n        int zahl = 3;\n        schrit();\n\n    public void b()\n    {\n        zahl = 4;\n    }');
    expect(parse(quelle).diagnosen.map((d) => d.code)).toEqual(['klammer-geschweift']);
  });

  it('else nach if(...); wird als Folge des Semikolons erklärt', () => {
    const quelle = M('if (hindernisVorn());', '{', '    linksDrehen();', '}', 'else', '{', '    schritt();', '}');
    const { diagnosen } = parse(quelle);
    expect(diagnosen.map((d) => [d.code, d.schwere, d.folgefehler === true])).toEqual([
      ['semikolon-nach-if', 'fehler', false],
      ['else-ohne-if', 'fehler', true],
    ]);
    expect(diagnosen[1].text).toContain('Das Semikolon hinter `if (…)` in Zeile 5');
  });

  it('nach einem offenen Kommentar sind fehlende Klammern nur Folgefehler', () => {
    const { diagnosen } = parse(K('    public void a()\n    {\n        /* offen\n        schritt();\n    }'));
    expect(diagnosen.filter((d) => !d.folgefehler).map((d) => d.code)).toEqual(['kommentar-offen']);
  });

  it('Positionen bei nurMethoden beziehen sich auf den Originaltext', () => {
    const quelle = 'public void a()\n{\n    schritt()\n}\n';
    const { diagnosen, programm } = parse(quelle, { nurMethoden: true });
    expect(programm).toBeNull();
    expect(diagnosen).toHaveLength(1);
    expect(diagnosen[0]).toMatchObject({ code: 'semikolon-fehlt', pos: { zeile: 3, spalte: 13 } });
    expect(quelle.slice(0, diagnosen[0].reparatur!.von)).toBe('public void a()\n{\n    schritt()');
    const repariert = wendeReparaturenAn(quelle, diagnosen)!;
    expect(parse(repariert, { nurMethoden: true }).programm).not.toBeNull();
  });
});

describe('außerhalb des Subsets: „Das kann die App nicht ausführen“', () => {
  it.each([
    ['Strings', 'int x = 0;\nString s = "Hallo";', 2],
    ['Text als Argument', 'fliegenFuettern("drei");', 1],
    ['System.out.println', 'System.out.println(5);', 1],
    ['new', 'int x = new Tarantel();', 1],
    ['Arrays', 'int[] a = new int[3];', 1],
    ['switch', 'int x = 1;\nswitch (x) { case 1: schritt(); break; default: linksDrehen(); }', 2],
    ['break', 'while (true) { break; }', 1],
    ['continue', 'while (hindernisVorn()) { continue; }', 1],
    ['Kommazahl', 'int x = 1.5;', 1],
    ['double', 'double d = 3;', 1],
    ['Bedingungsoperator', 'int x = hindernisVorn() ? 1 : 2;', 1],
    ['i++ im Ausdruck', 'int i = 0;\nint j = i++;', 2],
    ['*=', 'int i = 1;\ni *= 2;', 2],
    ['mehrere Variablen', 'int a, b;', 1],
    ['Greenfoot-Methode', 'move(3);', 1],
    ['Punkt-Aufruf', 'Greenfoot.delay(1);', 1],
  ])('%s', (_name, anweisungen, zeile) => {
    const quelle = M(...anweisungen.split('\n'));
    const { diagnosen, programm, entwurf } = parse(quelle);
    expect(diagnosen.filter((d) => d.schwere === 'fehler')).toEqual([]);
    const d = diagnosen.find((x) => x.schwere === 'nicht-unterstuetzt');
    expect(d).toBeDefined();
    expect(d!.code).toBe('nicht-unterstuetzt');
    expect(d!.text.startsWith('Das kann die App nicht ausführen')).toBe(true);
    expect(d!.text).not.toMatch(/Fehler/i);
    expect(d!.pos.zeile).toBe(4 + zeile);
    expect(d!.folgefehler).toBeUndefined();
    // Nicht ausführbar, aber als Entwurf zum Anzeigen vorhanden.
    expect(programm).toBeNull();
    expect(entwurf).not.toBeNull();
    // Kein Fehler im eigentlichen Sinn: Die Reparaturfunktion scheitert daran nicht.
    expect(wendeReparaturenAn(quelle, diagnosen)).toBe(quelle);
  });

  it('static, weitere Typen und zweite Klassen auf Klassenebene', () => {
    const { diagnosen } = parse(
      K('    private static int zaehler = 0;\n    private String name;\n    public double halb()\n    {\n        return 1;\n    }\n    public void ok()\n    {\n        schritt();\n    }') +
        'class Zweite\n{\n}\n',
    );
    expect(diagnosen.map((d) => [d.schwere, d.pos.zeile])).toEqual([
      ['nicht-unterstuetzt', 3],
      ['nicht-unterstuetzt', 4],
      ['nicht-unterstuetzt', 5],
      ['nicht-unterstuetzt', 14],
    ]);
  });

  it('else if ist dagegen ganz normales verschachteltes if', () => {
    const quelle = M(
      'if (hindernisVorn())',
      '{',
      '    linksDrehen();',
      '}',
      'else if (fliegeAmPlatz())',
      '{',
      '    fliegeFressen();',
      '}',
      'else if (klatscheVorn()) rechtsDrehen();',
      'else',
      '{',
      '    schritt();',
      '}',
    );
    const { programm, diagnosen } = parse(quelle);
    expect(diagnosen).toEqual([]);
    const lauf = (karte: string) => endzustand(fuehreAus(programm!, 'test', [], parseWelt(karte)).endwelt);
    expect(lauf('####\n#.>#\n####')).toMatchObject({ richtung: 270 });
    expect(lauf('#####\n#>F.#\n#####')).toMatchObject({ x: 2 });
    expect(lauf('#####\n#>K.#\n#####')).toMatchObject({ richtung: 90, lebt: true });
    expect(endzustand(fuehreAus(programm!, 'test', [], parseWelt('#####\n#>..#\n#####', { fliegenUnterSpinne: 1 })).endwelt)).toMatchObject({ x: 1, gefressen: 1 });
    expect(formatiere(programm!)).toContain('        else if (klatscheVorn())\n            rechtsDrehen();\n        else\n        {');
  });
});

describe('wendeReparaturenAn', () => {
  it('liefert null, wenn ein echter Fehler keine Reparatur hat', () => {
    const quelle = M('schritt()', 'huepfen();');
    const { diagnosen } = parse(quelle);
    expect(diagnosen.map((d) => d.code)).toEqual(['semikolon-fehlt', 'methode-unbekannt']);
    expect(wendeReparaturenAn(quelle, diagnosen)).toBeNull();
    expect(wendeReparaturenAn(quelle, diagnosen.slice(0, 1))).toBe(M('schritt();', 'huepfen();'));
  });

  it('wendet standardmäßig nur Fehler-Reparaturen an – Warnungen bleiben stehen', () => {
    const quelle = M('while (hindernisVorn());', '{', '    linksDrehen()', '}');
    const { diagnosen } = parse(quelle);
    expect(diagnosen.map((d) => d.schwere)).toEqual(['warnung', 'fehler']);
    expect(wendeReparaturenAn(quelle, diagnosen)).toBe(M('while (hindernisVorn());', '{', '    linksDrehen();', '}'));
    expect(wendeReparaturenAn(quelle, diagnosen, { schweren: ['fehler', 'warnung'] })).toBe(M('while (hindernisVorn())', '{', '    linksDrehen();', '}'));
  });

  it('gibt fehlerfreien Quelltext unverändert zurück', () => {
    const quelle = M('schritt();');
    expect(wendeReparaturenAn(quelle, parse(quelle).diagnosen)).toBe(quelle);
  });

  it('setzt mehrere Einfügungen an derselben Stelle in der richtigen Reihenfolge', () => {
    const quelle = M('schritt', 'while (hindernisVorn(', '{', '}');
    const { diagnosen } = parse(quelle);
    expect(wendeReparaturenAn(quelle, diagnosen)).toBe(M('schritt();', 'while (hindernisVorn())', '{', '}'));
  });
});

describe('Attribute und Konstruktor', () => {
  const quelle = K(
    [
      '    private int schritte = 2;',
      '    private boolean fertig;',
      '',
      '    public Tarantel()',
      '    {',
      '        schritte = schritte + 1;',
      '        this.fertig = false;',
      '    }',
      '',
      '    public int laufen()',
      '    {',
      '        for (int i = 0; i < schritte; i++)',
      '        {',
      '            schritt();',
      '        }',
      '        fertig = true;',
      '        return this.schritte;',
      '    }',
    ].join('\n'),
  );

  it('werden geparst, geprüft und vor dem Methodenaufruf ausgeführt', () => {
    const { programm, diagnosen } = parse(quelle);
    expect(diagnosen).toEqual([]);
    expect(programm!.klasse.felder).toMatchObject([
      { art: 'Feld', sicht: 'private', typ: 'int', name: 'schritte', wert: { art: 'Zahl', wert: 2 } },
      { art: 'Feld', sicht: 'private', typ: 'boolean', name: 'fertig' },
    ]);
    expect(programm!.klasse.konstruktoren).toHaveLength(1);
    const lauf = fuehreAus(programm!, 'laufen', [], parseWelt('#######\n#>....#\n#######'));
    expect(lauf.ende.grund).toBe('fertig');
    expect(lauf.rueckgabe).toBe(3);
    expect(lauf.endwelt.spinne.x).toBe(4);
    // Konstruktor und Initialisierer erzeugen keine Schritte; der erste Schritt sieht schon ihre Wirkung.
    expect(lauf.schritte[0].ereignis).toMatchObject({ art: 'aufruf', methode: 'laufen' });
    expect(lauf.schritte[0].attribute).toEqual([
      { name: 'schritte', typ: 'int', wert: 3 },
      { name: 'fertig', typ: 'boolean', wert: false },
    ]);
    expect(lauf.schritte[lauf.schritte.length - 1].attribute[1].wert).toBe(true);
    expect(formatiere(programm!)).toContain('    private int schritte = 2;\n    private boolean fertig;\n\n    public Tarantel()\n    {');
  });

  it('prüft Typen auch bei Attributen', () => {
    expect(parse(K('    private int x = true;')).diagnosen.map((d) => d.code)).toEqual(['typ-falsch']);
    expect(parse(K('    private int x;\n    private boolean x;')).diagnosen.map((d) => d.code)).toEqual(['variable-doppelt']);
  });
});

describe('Robustheit: der Parser stürzt bei keiner Eingabe ab und hängt nicht', () => {
  const tarantel = readFileSync(fileURLToPath(new URL('../fixtures/Tarantel.original.java', import.meta.url)), 'utf8');

  const pruefe = (quelle: string): void => {
    for (const nurMethoden of [false, true]) {
      const e = parse(quelle, { nurMethoden });
      for (const d of e.diagnosen) {
        expect(d.pos.von).toBeGreaterThanOrEqual(0);
        expect(d.pos.bis).toBeLessThanOrEqual(quelle.length);
        expect(d.pos.zeile).toBeGreaterThanOrEqual(1);
        if (d.reparatur) {
          expect(d.reparatur.von).toBeLessThanOrEqual(d.reparatur.bis);
          expect(d.reparatur.bis).toBeLessThanOrEqual(quelle.length);
        }
      }
      if (e.diagnosen.some((d) => d.schwere === 'fehler' || d.schwere === 'nicht-unterstuetzt')) expect(e.programm).toBeNull();
      wendeReparaturenAn(quelle, e.diagnosen);
      if (e.entwurf) formatiere(e.entwurf);
    }
    pruefeEinrueckung(quelle);
  };

  it.each([
    '',
    ' ',
    '}',
    '{',
    '(((',
    ')))',
    ';;;;',
    'public',
    'public class',
    'public class X {',
    'class { }',
    'public void',
    'public void a(',
    'public void a() { while',
    'public void a() { while (',
    'public void a() { if (x) else }',
    'public void a() { do } ',
    'public void a() { for (;;',
    'public void a() { for (int',
    'public void a() { return',
    'public void a() { x = ; y == ; z++ ++ }',
    'public void a() { this. }',
    'public void a() { a(b(c(d(e(',
    'else else else',
    'import',
    'import ;',
    '/*',
    '"',
    "'",
    '@',
    '@Override public void act() { }',
    '§§§ ~ ` # \\',
    'int int int',
    'void void',
    'public public public void a() {}',
    'while (true) { }',
    '} } } public void a() { } { { {',
    'public void a() { 1 2 3 + - * / }',
    'public void a() { new new new }',
    'public void a() { switch }',
    '\u0000\u0001￿',
    'ö ä ü ß = 5;',
    '😀 public void a() { schritt(); }',
  ])('Sonderfall %j', (quelle) => {
    expect(() => pruefe(quelle)).not.toThrow();
  });

  it('jeder abgeschnittene Anfang der Tarantel-Datei', () => {
    for (let ende = 0; ende <= tarantel.length; ende += 23) pruefe(tarantel.slice(0, ende));
  });

  it('zufällig verstümmelte Fassungen der Tarantel-Datei', () => {
    // Kleiner fester Zufallsgenerator, damit der Test reproduzierbar bleibt.
    let zustand = 12345;
    const zufall = (n: number): number => {
      zustand = (Math.imul(zustand, 1103515245) + 12345) & 0x7fffffff;
      return zustand % n;
    };
    const zeichen = ['{', '}', '(', ')', ';', '=', '==', 'else', 'while', 'public', '"', '/*', '*/', ' ', '\n', 'x', '5', '!', '&&'];
    for (let runde = 0; runde < 150; runde++) {
      let q = tarantel.slice(zufall(3000), 3000 + zufall(3000));
      for (let k = 0; k < 6; k++) {
        const stelle = zufall(q.length + 1);
        q = zufall(2) === 0 ? q.slice(0, stelle) + q.slice(stelle + 1 + zufall(8)) : q.slice(0, stelle) + zeichen[zufall(zeichen.length)] + q.slice(stelle);
      }
      pruefe(q);
    }
  });

  it('absurd tiefe Verschachtelung endet mit einer Diagnose statt mit einem Absturz', () => {
    const tief = M(`int x = ${'('.repeat(100_000)}1${')'.repeat(100_000)};`);
    const e = parse(tief);
    expect(e.programm).toBeNull();
    expect(e.diagnosen.map((d) => d.code)).toEqual(['zu-verschachtelt']);
    expect(() => parse(M('{'.repeat(50_000)))).not.toThrow();
    expect(() => parse(M('if (true) '.repeat(50_000)))).not.toThrow();
    expect(() => parse(M(`x = ${'!'.repeat(100_000)}true;`))).not.toThrow();
  });
});

describe('pruefeEinrueckung', () => {
  const allman = M('while (hindernisVorn())', '{', '    linksDrehen();', '}', 'if (fliegeAmPlatz())', '{', '    fliegeFressen();', '}', 'else', '{', '    schritt();', '}');
  const kUndR = [
    'public class Tarantel extends Spinne {',
    '    public void test() {',
    '        while (hindernisVorn()) {',
    '            linksDrehen();',
    '        }',
    '        if (fliegeAmPlatz()) {',
    '            fliegeFressen();',
    '        } else {',
    '            schritt();',
    '        }',
    '        do {',
    '            schritt();',
    '        } while (!hindernisVorn());',
    '    }',
    '}',
    '',
  ].join('\n');

  it('akzeptiert Allman- und K&R-Stil', () => {
    expect(pruefeEinrueckung(allman)).toEqual([]);
    expect(pruefeEinrueckung(kUndR)).toEqual([]);
  });

  it('akzeptiert jede einheitliche Schrittweite, Tabulatoren und Rümpfe ohne Klammern', () => {
    expect(pruefeEinrueckung(kUndR.replace(/ {4}/g, '  '))).toEqual([]);
    expect(pruefeEinrueckung(kUndR.replace(/ {4}/g, '\t'))).toEqual([]);
    expect(pruefeEinrueckung(M('if (hindernisVorn())', '    linksDrehen();', 'else', '    schritt();', 'while (hindernisVorn()', '        && !fliegeAmPlatz())', '    linksDrehen();'))).toEqual([]);
  });

  it('meldet Zeilen, deren Einrückung nicht zur Klammertiefe passt, als Stilhinweis mit Reparatur', () => {
    const schief = M('while (hindernisVorn())', '{', 'linksDrehen();', '    schritt();', '    schritt();', '  }', '   schritt();');
    const hinweise = pruefeEinrueckung(schief);
    expect(hinweise.map((d) => [d.code, d.schwere, d.pos.zeile])).toEqual([
      ['einrueckung', 'stil', 7],
      ['einrueckung', 'stil', 10],
      ['einrueckung', 'stil', 11],
    ]);
    expect(hinweise[0].text).toContain('Zeile 7 beginnt mit 8 Leerzeichen, passend wären 12');
    expect(hinweise[1].text).toContain('schließende `}`');
    expect(hinweise.every((d) => d.tipp !== undefined && d.reparatur !== undefined)).toBe(true);
    // Stilhinweise gehören nicht zu parse(); ihre Reparaturen rücken die Zeilen gerade.
    expect(parse(schief).diagnosen).toEqual([]);
    const gerade = wendeReparaturenAn(schief, hinweise, { schweren: ['stil'] })!;
    expect(pruefeEinrueckung(gerade)).toEqual([]);
    expect(gerade).toBe(M('while (hindernisVorn())', '{', '    linksDrehen();', '    schritt();', '    schritt();', '}', 'schritt();'));
  });

  it('formatierter Quelltext ist immer sauber eingerückt', () => {
    const wild = 'public class Tarantel extends Spinne{public void a(){while(hindernisVorn()){linksDrehen();}if(fliegeAmPlatz())fliegeFressen();else{schritt();}}}';
    const formatiert = formatiere(parse(wild).programm!);
    expect(pruefeEinrueckung(formatiert)).toEqual([]);
    expect(formatiert).toBe(
      [
        'public class Tarantel extends Spinne',
        '{',
        '    public void a()',
        '    {',
        '        while (hindernisVorn())',
        '        {',
        '            linksDrehen();',
        '        }',
        '        if (fliegeAmPlatz())',
        '            fliegeFressen();',
        '        else',
        '        {',
        '            schritt();',
        '        }',
        '    }',
        '}',
        '',
      ].join('\n'),
    );
  });
});
