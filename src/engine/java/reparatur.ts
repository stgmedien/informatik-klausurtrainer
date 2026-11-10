import type { Diagnose, Schwere } from './ast';

/**
 * Wendet die Reparaturvorschläge der übergebenen Diagnosen auf den Quelltext an.
 * Standardmäßig nur die der Schwere 'fehler' – Warnungen (z.B. `;` nach `while (...)`) ändern das
 * Verhalten des Programms und sollen nicht stillschweigend verschwinden.
 * Liefert null, wenn ein echter Fehler (kein Folgefehler) keine Reparatur hat.
 */
export function wendeReparaturenAn(quelltext: string, diagnosen: Diagnose[], opt?: { schweren?: Schwere[] }): string | null {
  const schweren = opt?.schweren ?? ['fehler'];
  if (diagnosen.some((d) => d.schwere === 'fehler' && !d.folgefehler && !d.reparatur)) return null;

  const reparaturen = diagnosen
    .map((d, index) => ({ d, index }))
    .filter(({ d }) => d.reparatur !== undefined && schweren.includes(d.schwere))
    .map(({ d, index }) => ({ ...d.reparatur!, index }))
    // Bei gleicher Stelle zählt die Reihenfolge der Diagnosen: erst `()`, dann `;`.
    .sort((a, b) => a.von - b.von || a.index - b.index);

  let ergebnis = '';
  let pos = 0;
  for (const r of reparaturen) {
    if (r.von < pos || r.bis < r.von || r.bis > quelltext.length) continue;
    ergebnis += quelltext.slice(pos, r.von) + r.ersatz;
    pos = r.bis;
  }
  return ergebnis + quelltext.slice(pos);
}
