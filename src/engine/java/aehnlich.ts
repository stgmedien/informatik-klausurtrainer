/** Damerau-Levenshtein-Abstand (ein Buchstabendreher zählt als eine Änderung). */
export function abstand(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let vorvor: number[] = [];
  let vor: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const akt: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const kosten = a[i - 1] === b[j - 1] ? 0 : 1;
      let wert = Math.min(vor[j] + 1, akt[j - 1] + 1, vor[j - 1] + kosten);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        wert = Math.min(wert, vorvor[j - 2] + 1);
      }
      akt.push(wert);
    }
    vorvor = vor;
    vor = akt;
  }
  return vor[n];
}

export interface Vorschlag {
  /** Beste Kandidaten, bei Gleichstand mehrere. */
  namen: string[];
  /** true, wenn sich Name und Vorschlag nur in der Groß-/Kleinschreibung unterscheiden. */
  nurSchreibweise: boolean;
}

/**
 * Sucht zu einem unbekannten Namen die ähnlichsten bekannten:
 * zuerst ohne Groß-/Kleinschreibung, dann mit Damerau-Levenshtein-Abstand ≤ 2
 * (bei kurzen Namen strenger, damit nicht alles zu allem passt).
 */
export function aehnliche(name: string, kandidaten: Iterable<string>): Vorschlag | null {
  const alle = [...new Set(kandidaten)].filter((k) => k !== name);
  const klein = name.toLowerCase();
  const gleich = alle.filter((k) => k.toLowerCase() === klein);
  if (gleich.length > 0) return { namen: gleich, nurSchreibweise: true };

  const grenze = name.length <= 3 ? 0 : name.length <= 5 ? 1 : 2;
  let bester = grenze + 1;
  let namen: string[] = [];
  for (const k of alle) {
    if (Math.abs(k.length - name.length) > grenze) continue;
    const d = abstand(klein, k.toLowerCase());
    if (d < bester) {
      bester = d;
      namen = [k];
    } else if (d === bester && d <= grenze) {
      namen.push(k);
    }
  }
  return namen.length > 0 ? { namen, nurSchreibweise: false } : null;
}
