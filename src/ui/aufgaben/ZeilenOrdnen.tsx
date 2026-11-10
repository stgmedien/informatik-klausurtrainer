import { useMemo, useState } from 'react';
import { type Bewertung, bewerteZeilen, zeilenDerLoesung } from '../../lernen/bewertung';
import { CodeAnsicht } from '../bausteine/MaterialAnsicht';
import { hash, mische } from '../hilfen';
import { AbgabeKnopf, type TeilProps } from './einfach';

interface Gesetzt {
  /** Index in der Vorratsliste. */
  stueck: number;
  stufe: number;
}

/**
 * Zeilen ordnen und einrücken („Parsons-Aufgabe“): Die Zeilen sind vorgegeben,
 * Reihenfolge und Einrückung müssen stimmen. Zeilen, die nicht dazugehören, bleiben liegen.
 */
export function ZeilenOrdnen({ aufgabe, durchgang, fertig, onAbgabe }: TeilProps<'zeilen-ordnen'>) {
  const loesung = useMemo(() => zeilenDerLoesung(aufgabe.loesung), [aufgabe]);
  const vorrat = useMemo(
    () => mische([...loesung.map((z) => z.text), ...(aufgabe.distraktoren ?? [])], hash(aufgabe.id) + durchgang),
    [aufgabe, loesung, durchgang],
  );
  const [gesetzt, setGesetzt] = useState<Gesetzt[]>([]);
  const [ergebnis, setErgebnis] = useState<(Bewertung & { stelleRichtig: boolean[]; stufeRichtig: boolean[] }) | null>(null);
  const benutzt = new Set(gesetzt.map((g) => g.stueck));

  // Eine neue Zeile übernimmt die Einrückung der vorigen – einrücken muss man selbst, wie auf Papier.
  const nimm = (stueck: number) => setGesetzt([...gesetzt, { stueck, stufe: gesetzt[gesetzt.length - 1]?.stufe ?? 0 }]);
  const aendere = (i: number, teil: Partial<Gesetzt>) => setGesetzt(gesetzt.map((g, n) => (n === i ? { ...g, ...teil, stufe: Math.max(0, Math.min(6, teil.stufe ?? g.stufe)) } : g)));
  const schiebe = (i: number, r: -1 | 1) => {
    const j = i + r;
    if (j < 0 || j >= gesetzt.length) return;
    const neu = [...gesetzt];
    [neu[i], neu[j]] = [neu[j], neu[i]];
    setGesetzt(neu);
  };

  const abgeben = () => {
    const b = bewerteZeilen(
      aufgabe,
      gesetzt.map((g) => ({ text: vorrat[g.stueck], stufe: g.stufe })),
    );
    setErgebnis(b);
    onAbgabe({ punkte: b.punkte, max: b.max, quelle: 'automatisch', ...(b.punkte < b.max ? { muster: b.stufeRichtig.every(Boolean) ? [] : ['darstellung.einrueckung'] } : {}) });
  };

  return (
    <div className="zeilen-ordnen">
      <div className="zo-spalten">
        <section>
          <h4>Zeilen</h4>
          <ul className="zo-vorrat">
            {vorrat.map((z, i) =>
              benutzt.has(i) ? null : (
                <li key={i}>
                  <button className="zo-zeile" disabled={fertig} onClick={() => nimm(i)}>
                    {z}
                  </button>
                </li>
              ),
            )}
          </ul>
          {!fertig && (
            <p className="hilfstext">
              Klicke eine Zeile an, um sie unten an dein Programm anzuhängen. Mit ⇤ und ⇥ rückst du ein, mit ▲ ▼ verschiebst du. Nicht jede Zeile
              gehört dazu.
            </p>
          )}
        </section>
        <section>
          <h4>Dein Programm</h4>
          {gesetzt.length === 0 && <p className="leise-text">Noch leer.</p>}
          <ol className="zo-programm">
            {gesetzt.map((g, i) => {
              const zustand = ergebnis ? (ergebnis.stelleRichtig[i] && ergebnis.stufeRichtig[i] ? ' richtig' : ' falsch') : '';
              return (
                <li key={`${g.stueck}-${i}`} className={`zo-gesetzt${zustand}`}>
                  <code className="zo-text" style={{ paddingLeft: `${g.stufe * 4}ch` }}>
                    {vorrat[g.stueck]}
                  </code>
                  {!fertig && (
                    <span className="zo-knoepfe">
                      <button className="mini" onClick={() => aendere(i, { stufe: g.stufe - 1 })} aria-label="Weniger einrücken" disabled={g.stufe === 0}>
                        ⇤
                      </button>
                      <button className="mini" onClick={() => aendere(i, { stufe: g.stufe + 1 })} aria-label="Weiter einrücken">
                        ⇥
                      </button>
                      <button className="mini" onClick={() => schiebe(i, -1)} aria-label="Nach oben" disabled={i === 0}>
                        ▲
                      </button>
                      <button className="mini" onClick={() => schiebe(i, 1)} aria-label="Nach unten" disabled={i === gesetzt.length - 1}>
                        ▼
                      </button>
                      <button className="mini" onClick={() => setGesetzt(gesetzt.filter((_, n) => n !== i))} aria-label="Zeile zurücklegen">
                        ✕
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
      {ergebnis && (
        <div className="loesung-kasten">
          <p>
            Reihenfolge: {ergebnis.stelleRichtig.filter(Boolean).length} von {loesung.length} Zeilen an der richtigen Stelle · Einrückung:{' '}
            {ergebnis.stufeRichtig.filter(Boolean).length} von {loesung.length} richtig.
          </p>
          <CodeAnsicht quelltext={aufgabe.loesung} titel="Richtige Lösung" />
        </div>
      )}
      {!fertig && <AbgabeKnopf aktiv={gesetzt.length > 0} onClick={abgeben} />}
    </div>
  );
}
