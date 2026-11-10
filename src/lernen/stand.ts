// Lernstand: was geübt wurde und wie sicher jedes Lernziel der Kann-Liste sitzt.

export type Grad = 0 | 1 | 2 | 3;

export const GRAD_NAMEN: Record<Grad, string> = { 0: 'offen', 1: 'geübt', 2: 'sicher', 3: 'klausurfest' };

export interface KannStand {
  grad: Grad;
  /** Tage (JJJJ-MM-TT), an denen eine Aufgabe ohne Hinweis richtig gelöst wurde. */
  tageRichtig: string[];
  /** Mindestens eine Aufgabe im Klausurformat ohne Hinweis richtig. */
  klausurnahRichtig: boolean;
  faelligAm?: string;
}

export interface Versuch {
  id: string;
  aufgabe: string;
  kann: string[];
  zeit: string;
  tag: string;
  punkte: number;
  max: number;
  quelle: 'automatisch' | 'selbst' | 'ki';
  hinweise: number;
  klausurnah: boolean;
  /** Erkannte Fehlermuster (Katalog-IDs). */
  muster?: string[];
}

export interface Lernstand {
  version: 1;
  erstellt: string;
  klausurDatum?: string;
  kann: Record<string, KannStand>;
  versuche: Versuch[];
  /** Fortschritt je Tageseinheit. */
  einheiten: Record<string, { schritt: number; fertigAm?: string }>;
  /** Eigener Wortlaut für Merksätze (ersetzt die Vorgabe). */
  merksaetze: Record<string, string>;
  /** Lektion mit dem eigenen Heft abgeglichen. */
  heftAbgleich: Record<string, boolean>;
  /** Zuletzt eingegebener Freitext je Aufgabe. */
  antworten: Record<string, string>;
  gelesen: Record<string, string>;
  /** Beschriftung der Verzweigung im Struktogramm: Arbeitsblatt (Wahr/Falsch) oder Video (Ja/Nein). */
  struktoBeschriftung?: 'wahr-falsch' | 'ja-nein';
}

export function heute(datum = new Date()): string {
  const jahr = datum.getFullYear();
  const monat = String(datum.getMonth() + 1).padStart(2, '0');
  const tag = String(datum.getDate()).padStart(2, '0');
  return `${jahr}-${monat}-${tag}`;
}

export function plusTage(tag: string, anzahl: number): string {
  const [j, m, t] = tag.split('-').map(Number);
  return heute(new Date(j, m - 1, t + anzahl));
}

export function tageBis(von: string, bis: string): number {
  const zeit = (tag: string) => {
    const [j, m, t] = tag.split('-').map(Number);
    return Date.UTC(j, m - 1, t);
  };
  return Math.round((zeit(bis) - zeit(von)) / 86_400_000);
}

export function neuerStand(): Lernstand {
  return {
    version: 1,
    erstellt: new Date().toISOString(),
    kann: {},
    versuche: [],
    einheiten: {},
    merksaetze: {},
    heftAbgleich: {},
    antworten: {},
    gelesen: {},
  };
}

/** Ergänzt fehlende Felder, falls die Datei von einer älteren Fassung stammt. */
export function ergaenzeStand(roh: unknown): Lernstand {
  const basis = neuerStand();
  if (!roh || typeof roh !== 'object') return basis;
  return { ...basis, ...(roh as Partial<Lernstand>), version: 1 };
}

export const BESTANDEN_AB = 0.8;

export function istRichtig(v: Pick<Versuch, 'punkte' | 'max'>): boolean {
  return v.max > 0 && v.punkte / v.max >= BESTANDEN_AB;
}

const LEER: KannStand = { grad: 0, tageRichtig: [], klausurnahRichtig: false };

export function kannStand(stand: Lernstand, id: string): KannStand {
  return stand.kann[id] ?? LEER;
}

/**
 * Regeln für den Beherrschungsgrad:
 * - mit Hinweis oder falsch gelöst: höchstens „geübt“, morgen wieder fällig
 * - einmal ohne Hinweis richtig: „sicher“
 * - an zwei verschiedenen Tagen ohne Hinweis richtig, davon einmal im Klausurformat: „klausurfest“
 * - ein Fehler senkt den Grad um eine Stufe
 */
export function neuerKannStand(alt: KannStand, v: Versuch): KannStand {
  const richtig = istRichtig(v);
  if (!richtig) {
    return {
      grad: Math.max(1, alt.grad - 1) as Grad,
      tageRichtig: alt.tageRichtig.slice(-1),
      klausurnahRichtig: alt.klausurnahRichtig,
      faelligAm: plusTage(v.tag, 1),
    };
  }
  if (v.hinweise > 0) {
    return { ...alt, grad: Math.max(1, alt.grad) as Grad, faelligAm: plusTage(v.tag, 1) };
  }
  const tageRichtig = alt.tageRichtig.includes(v.tag) ? alt.tageRichtig : [...alt.tageRichtig, v.tag];
  const klausurnahRichtig = alt.klausurnahRichtig || v.klausurnah;
  const grad: Grad = tageRichtig.length >= 2 && klausurnahRichtig ? 3 : 2;
  return { grad, tageRichtig, klausurnahRichtig, faelligAm: plusTage(v.tag, grad === 3 ? 3 : tageRichtig.length >= 2 ? 2 : 1) };
}

export function verbuche(stand: Lernstand, v: Versuch): Lernstand {
  const kann = { ...stand.kann };
  for (const id of v.kann) kann[id] = neuerKannStand(kannStand(stand, id), v);
  return { ...stand, kann, versuche: [...stand.versuche, v] };
}

export function letzterVersuch(stand: Lernstand, aufgabe: string): Versuch | undefined {
  for (let i = stand.versuche.length - 1; i >= 0; i--) {
    if (stand.versuche[i].aufgabe === aufgabe) return stand.versuche[i];
  }
  return undefined;
}
