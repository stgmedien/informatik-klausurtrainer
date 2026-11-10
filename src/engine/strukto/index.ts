// Struktogramme (Nassi-Shneiderman) aus dem Syntaxbaum einer Methode.
// Texte wahlweise umgangssprachlich wie im Unterricht („Gehe einen Schritt nach vorne“, „Ist ein Hindernis vor mir?“)
// oder als Java-Ausdruck. Jeder Block kennt die Knoten-IDs, aus denen er entstanden ist – so kann der
// Stepper den gerade ausgeführten Block hervorheben.
import type { Anweisung, Ausdruck, Methode, Programm, Zaehl } from '../java';
import { findeEingebaut } from '../java';

export type SBlock =
  | { art: 'anweisung'; ids: number[]; text: string }
  | { art: 'aufruf'; ids: number[]; text: string }
  | { art: 'kopf'; ids: number[]; bedingung: string; rumpf: SBlock[] }
  | { art: 'fuss'; ids: number[]; bedingung: string; rumpf: SBlock[] }
  | { art: 'zaehl'; ids: number[]; kopf: string; rumpf: SBlock[] }
  | { art: 'verzweigung'; ids: number[]; bedingung: string; dann: SBlock[]; sonst: SBlock[] };

export interface Struktogramm {
  methode: string;
  titel: string;
  bloecke: SBlock[];
}

export type Sprache = 'umgangssprache' | 'java';

/** Quelltext eines Knotens, auf eine Zeile gebracht. */
function text(programm: Programm, k: { pos: { von: number; bis: number } }): string {
  return programm.quelltext.slice(k.pos.von, k.pos.bis).replace(/\s+/g, ' ').trim();
}

function ohneAussenklammer(a: Ausdruck): Ausdruck {
  return a.art === 'Klammer' ? ohneAussenklammer(a.inhalt) : a;
}

/** Verneint eine Frage aus dem Unterricht: „Ist ein Hindernis vor mir?“ → „Ist kein Hindernis vor mir?“ */
export function verneine(frage: string): string | null {
  if (/\beine\b/.test(frage)) return frage.replace(/\beine\b/, 'keine');
  if (/\bein\b/.test(frage)) return frage.replace(/\bein\b/, 'kein');
  return null;
}

function kleinAnfang(satz: string): string {
  return satz.charAt(0).toLowerCase() + satz.slice(1);
}

/** Umgangssprachliche Frage zu einer Bedingung oder null, wenn sie sich nicht schön formulieren lässt. */
function frage(a: Ausdruck): string | null {
  const k = ohneAussenklammer(a);
  if (k.art === 'Aufruf' && k.argumente.length === 0) {
    const e = findeEingebaut(k.name);
    return e && e.art === 'sensor' && e.rueckgabe === 'boolean' ? e.phrase : null;
  }
  if (k.art === 'Unaer' && k.op === '!') {
    const innen = ohneAussenklammer(k.operand);
    // Nur einfache Sensoren werden umformuliert; „nicht (A und B)“ bleibt Java, damit nichts verfälscht wird.
    if (innen.art !== 'Aufruf') return null;
    const f = frage(innen);
    return f ? verneine(f) : null;
  }
  if (k.art === 'Binaer' && (k.op === '&&' || k.op === '||')) {
    const teile: Ausdruck[] = [];
    const sammle = (x: Ausdruck) => {
      const y = ohneAussenklammer(x);
      if (y.art === 'Binaer' && y.op === k.op && y === x) {
        sammle(y.links);
        sammle(y.rechts);
      } else teile.push(x);
    };
    sammle(k.links);
    sammle(k.rechts);
    // Eingeklammerte Teilausdrücke würden in Umgangssprache ihre Bedeutung verlieren.
    if (teile.some((t) => t.art === 'Klammer')) return null;
    const fragen = teile.map(frage);
    if (fragen.some((f) => f === null)) return null;
    const wort = k.op === '&&' ? ' und ' : ' oder ';
    return fragen.map((f, i) => (i === 0 ? f!.replace(/\?$/, '') : kleinAnfang(f!).replace(/\?$/, ''))).join(wort) + '?';
  }
  return null;
}

function bedingungsText(programm: Programm, a: Ausdruck, sprache: Sprache): string {
  return (sprache === 'umgangssprache' && frage(a)) || text(programm, a);
}

function aufrufText(programm: Programm, a: Ausdruck & { art: 'Aufruf' }, sprache: Sprache): { text: string; eigen: boolean } {
  const e = findeEingebaut(a.name);
  if (!e) return { text: text(programm, a), eigen: true };
  if (sprache === 'java') return { text: text(programm, a), eigen: false };
  let satz = e.phrase;
  e.parameter.forEach((p, i) => {
    satz = satz.replace(`{${p.name}}`, a.argumente[i] ? text(programm, a.argumente[i]) : p.name);
  });
  return { text: satz, eigen: false };
}

function zaehlKopf(programm: Programm, z: Zaehl, sprache: Sprache): string {
  // for(int i = 0; i < N; i++) → „zähle i von 0 bis N−1“
  if (sprache === 'umgangssprache' && z.init?.art === 'VarDekl' && z.init.wert?.art === 'Zahl' && z.bedingung?.art === 'Binaer') {
    const name = z.init.name;
    const b = z.bedingung;
    const start = z.init.wert.wert;
    const plus = z.schritt?.art === 'Inkrement' && z.schritt.op === '++' && z.schritt.name === name;
    if (plus && b.links.art === 'Var' && b.links.name === name && (b.op === '<' || b.op === '<=')) {
      const ende = b.rechts.art === 'Zahl' ? String(b.op === '<' ? b.rechts.wert - 1 : b.rechts.wert) : `${text(programm, b.rechts)}${b.op === '<' ? ' − 1' : ''}`;
      return `zähle ${name} von ${start} bis ${ende}`;
    }
  }
  const teile = [z.init ? text(programm, z.init).replace(/;$/, '') : '', z.bedingung ? text(programm, z.bedingung) : '', z.schritt ? text(programm, z.schritt).replace(/;$/, '') : ''];
  return `for (${teile.join('; ')})`;
}

/** IDs aller Ausdrücke einer Bedingung (damit Teilschritte den Block treffen). */
function ausdruckIds(a: Ausdruck | undefined, ziel: number[] = []): number[] {
  if (!a) return ziel;
  ziel.push(a.id);
  if (a.art === 'Binaer') {
    ausdruckIds(a.links, ziel);
    ausdruckIds(a.rechts, ziel);
  } else if (a.art === 'Unaer') ausdruckIds(a.operand, ziel);
  else if (a.art === 'Klammer') ausdruckIds(a.inhalt, ziel);
  else if (a.art === 'Aufruf') a.argumente.forEach((x) => ausdruckIds(x, ziel));
  return ziel;
}

function bloecke(programm: Programm, a: Anweisung | undefined, sprache: Sprache): SBlock[] {
  if (!a) return [];
  switch (a.art) {
    case 'Block':
      return a.anweisungen.flatMap((x) => bloecke(programm, x, sprache));
    case 'Leer':
    case 'Luecke':
      return [];
    case 'AufrufAnw': {
      const { text: t, eigen } = aufrufText(programm, a.aufruf, sprache);
      return [{ art: eigen ? 'aufruf' : 'anweisung', ids: [a.id, ...ausdruckIds(a.aufruf)], text: t }];
    }
    case 'VarDekl':
    case 'Zuweisung':
    case 'Inkrement':
      return [{ art: 'anweisung', ids: [a.id, ...('wert' in a ? ausdruckIds(a.wert) : [])], text: text(programm, a).replace(/;$/, '') }];
    case 'Rueckgabe':
      return [
        {
          art: 'anweisung',
          ids: [a.id, ...ausdruckIds(a.wert)],
          text: sprache === 'umgangssprache' && a.wert ? `Gib ${text(programm, a.wert)} zurück` : text(programm, a).replace(/;$/, ''),
        },
      ];
    case 'Wenn':
      return [
        {
          art: 'verzweigung',
          ids: [a.id, ...ausdruckIds(a.bedingung)],
          bedingung: bedingungsText(programm, a.bedingung, sprache),
          dann: bloecke(programm, a.dann, sprache),
          sonst: bloecke(programm, a.sonst, sprache),
        },
      ];
    case 'Solange':
      return [{ art: 'kopf', ids: [a.id, ...ausdruckIds(a.bedingung)], bedingung: bedingungsText(programm, a.bedingung, sprache), rumpf: bloecke(programm, a.rumpf, sprache) }];
    case 'Wiederhole':
      return [{ art: 'fuss', ids: [a.id, ...ausdruckIds(a.bedingung)], bedingung: bedingungsText(programm, a.bedingung, sprache), rumpf: bloecke(programm, a.rumpf, sprache) }];
    case 'Zaehl':
      return [
        {
          art: 'zaehl',
          ids: [a.id, ...ausdruckIds(a.bedingung), ...(a.init ? [a.init.id] : []), ...(a.schritt ? [a.schritt.id] : [])],
          kopf: zaehlKopf(programm, a, sprache),
          rumpf: bloecke(programm, a.rumpf, sprache),
        },
      ];
  }
}

function methodenTitel(m: Methode): string {
  return `${m.name}(${m.parameter.map((p) => `${p.typ} ${p.name}`).join(', ')})`;
}

export function struktogramm(programm: Programm, methode: string, sprache: Sprache = 'umgangssprache'): Struktogramm {
  const m = programm.klasse.methoden.find((x) => x.name === methode);
  if (!m) throw new Error(`Methode ${methode} gibt es nicht.`);
  return { methode, titel: methodenTitel(m), bloecke: bloecke(programm, m.rumpf, sprache) };
}

/** Struktogramme der Methode und aller selbst geschriebenen Methoden, die sie (auch indirekt) aufruft. */
export function struktogrammeMitHilfsmethoden(programm: Programm, methode: string, sprache: Sprache = 'umgangssprache'): Struktogramm[] {
  const reihenfolge: string[] = [];
  const besuche = (name: string) => {
    if (reihenfolge.includes(name)) return;
    const m = programm.klasse.methoden.find((x) => x.name === name);
    if (!m) return;
    reihenfolge.push(name);
    for (const treffer of text(programm, m.rumpf).matchAll(/\b([\p{L}_][\p{L}\p{N}_]*)\s*\(/gu)) {
      if (!findeEingebaut(treffer[1])) besuche(treffer[1]);
    }
  };
  besuche(methode);
  return reihenfolge.map((name) => struktogramm(programm, name, sprache));
}

/** Findet den innersten Block, zu dem ein Knoten gehört (für die Hervorhebung beim Durchsteppen). */
export function blockZuKnoten(bloecke: SBlock[], knoten: number): SBlock | null {
  for (const b of bloecke) {
    const kinder = b.art === 'verzweigung' ? [...b.dann, ...b.sonst] : 'rumpf' in b ? b.rumpf : [];
    const innen = blockZuKnoten(kinder, knoten);
    if (innen) return innen;
    if (b.ids.includes(knoten)) return b;
  }
  return null;
}

const ART_NAME: Record<SBlock['art'], string> = {
  anweisung: 'Anweisung',
  aufruf: 'Methodenaufruf',
  kopf: 'Kopfgesteuerte Schleife',
  fuss: 'Fußgesteuerte Schleife',
  zaehl: 'Zählschleife',
  verzweigung: 'Verzweigung',
};

/**
 * Checkliste zum Selbstvergleich eines auf Papier gezeichneten Struktogramms.
 * Jeder Eintrag beschreibt einen Baustein mit seiner Lage.
 */
export function checkliste(s: Struktogramm): string[] {
  const liste: string[] = [];
  const lauf = (bloecke: SBlock[], ort: string) => {
    bloecke.forEach((b, i) => {
      const wo = i === 0 ? ort : `danach (${ort.replace(/^zuerst /, '')})`;
      const zusatz = b.art === 'anweisung' || b.art === 'aufruf' ? `„${b.text}“` : b.art === 'zaehl' ? `„${b.kopf}“` : `mit der Bedingung „${b.bedingung}“`;
      liste.push(`${ART_NAME[b.art]} ${zusatz} – ${wo}`);
      if (b.art === 'verzweigung') {
        if (b.dann.length) lauf(b.dann, `zuerst im Wahr-Zweig von „${b.bedingung}“`);
        else liste.push(`Wahr-Zweig von „${b.bedingung}“ ist leer (∅)`);
        if (b.sonst.length) lauf(b.sonst, `zuerst im Falsch-Zweig von „${b.bedingung}“`);
        else liste.push(`Falsch-Zweig von „${b.bedingung}“ ist leer (∅)`);
      } else if ('rumpf' in b) lauf(b.rumpf, `zuerst im Rumpf von „${b.art === 'zaehl' ? b.kopf : b.bedingung}“`);
    });
  };
  lauf(s.bloecke, 'ganz oben');
  return liste;
}
