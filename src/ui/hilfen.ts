import { zufall } from '../engine/logik';

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mischt reproduzierbar: gleicher Startwert → gleiche Reihenfolge. */
export function mische<T>(liste: readonly T[], startwert: number): T[] {
  const rng = zufall(startwert);
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

/** Wie mische, garantiert aber, dass die Reihenfolge nicht schon der Lösung entspricht. */
export function mischeAnders<T>(liste: readonly T[], startwert: number): T[] {
  if (liste.length < 2) return [...liste];
  for (let versuch = 0; versuch < 20; versuch++) {
    const gemischt = mische(liste, startwert + versuch);
    if (gemischt.some((x, i) => x !== liste[i])) return gemischt;
  }
  return [...liste].reverse();
}

export function punkteText(punkte: number, max: number): string {
  const zahl = (n: number) => String(n).replace('.', ',');
  return `${zahl(punkte)} von ${zahl(max)} ${max === 1 ? 'Punkt' : 'Punkten'}`;
}

export function datumLang(tag: string): string {
  const [j, m, t] = tag.split('-').map(Number);
  return new Date(j, m - 1, t).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}
