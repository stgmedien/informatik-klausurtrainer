// Klassenmodell mit Vererbung: berechnet, welche Attribute und Methoden ein Objekt besitzt.

export interface KAttribut {
  name: string;
  typ?: string;
  /** '-' = private, '+' = public (UML-Schreibweise). */
  sicht?: '+' | '-';
}

export interface KMethode {
  name: string;
  parameter?: string;
  rueckgabe?: string;
  sicht?: '+' | '-';
}

export interface KKlasse {
  name: string;
  ober?: string;
  attribute: KAttribut[];
  methoden: KMethode[];
}

export interface KlassenModell {
  klassen: KKlasse[];
}

export interface Mitglied {
  name: string;
  /** Klasse, in der das Mitglied definiert ist. */
  von: string;
  geerbt: boolean;
}

export function findeKlasse(modell: KlassenModell, name: string): KKlasse | undefined {
  return modell.klassen.find((k) => k.name === name);
}

/** Die Klasse selbst und alle Oberklassen, von unten nach oben. */
export function ahnenreihe(modell: KlassenModell, name: string): KKlasse[] {
  const reihe: KKlasse[] = [];
  let aktuell = findeKlasse(modell, name);
  while (aktuell && !reihe.includes(aktuell)) {
    reihe.push(aktuell);
    aktuell = aktuell.ober ? findeKlasse(modell, aktuell.ober) : undefined;
  }
  return reihe;
}

export function unterklassen(modell: KlassenModell, name: string): KKlasse[] {
  return modell.klassen.filter((k) => k.ober === name);
}

/** Alles, was ein Objekt der Klasse besitzt: eigene und (auch über mehrere Stufen) geerbte Mitglieder. */
export function besitz(modell: KlassenModell, name: string): { attribute: Mitglied[]; methoden: Mitglied[] } {
  const attribute: Mitglied[] = [];
  const methoden: Mitglied[] = [];
  for (const klasse of ahnenreihe(modell, name).reverse()) {
    const geerbt = klasse.name !== name;
    for (const a of klasse.attribute) {
      if (!attribute.some((m) => m.name === a.name)) attribute.push({ name: a.name, von: klasse.name, geerbt });
    }
    for (const m of klasse.methoden) {
      const vorhanden = methoden.findIndex((x) => x.name === m.name);
      // Eine gleichnamige Methode der Unterklasse ersetzt die geerbte.
      if (vorhanden >= 0) methoden[vorhanden] = { name: m.name, von: klasse.name, geerbt };
      else methoden.push({ name: m.name, von: klasse.name, geerbt });
    }
  }
  return { attribute, methoden };
}

export function alleMitglieder(modell: KlassenModell): { attribute: string[]; methoden: string[] } {
  const attribute = new Set<string>();
  const methoden = new Set<string>();
  for (const k of modell.klassen) {
    k.attribute.forEach((a) => attribute.add(a.name));
    k.methoden.forEach((m) => methoden.add(m.name));
  }
  return { attribute: [...attribute], methoden: [...methoden] };
}

/** Formale Fehler im Modell (für Inhaltstests und den späteren Editor). */
export function pruefeModell(modell: KlassenModell): string[] {
  const fehler: string[] = [];
  const namen = new Set<string>();
  for (const k of modell.klassen) {
    if (namen.has(k.name)) fehler.push(`Die Klasse „${k.name}“ kommt doppelt vor.`);
    namen.add(k.name);
    if (!/^\p{Lu}/u.test(k.name)) fehler.push(`Klassennamen beginnen mit einem Großbuchstaben: „${k.name}“.`);
  }
  for (const k of modell.klassen) {
    if (k.ober && !namen.has(k.ober)) fehler.push(`„${k.name}“ erbt von der unbekannten Klasse „${k.ober}“.`);
    const besucht = new Set<string>();
    let aktuell: KKlasse | undefined = k;
    while (aktuell?.ober) {
      if (besucht.has(aktuell.name)) {
        fehler.push(`Vererbung im Kreis bei „${k.name}“.`);
        break;
      }
      besucht.add(aktuell.name);
      aktuell = findeKlasse(modell, aktuell.ober);
    }
  }
  return fehler;
}

export function attributText(a: KAttribut): string {
  return `${a.sicht ?? '-'} ${a.name}${a.typ ? ` : ${a.typ}` : ''}`;
}

export function methodeText(m: KMethode): string {
  return `${m.sicht ?? '+'} ${m.name}(${m.parameter ?? ''})${m.rueckgabe ? ` : ${m.rueckgabe}` : ''}`;
}
