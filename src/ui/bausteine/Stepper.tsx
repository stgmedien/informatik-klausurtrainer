import { useEffect, useMemo, useState } from 'react';
import type { Diagnose, Lauf, Programm } from '../../engine/java';
import type { Welt } from '../../engine/welt';
import { beschreibeSchritt, endeText, zeigeJavaWert } from '../../lernen/ausfuehren';
import { Inline } from '../Markdown';
import { CodeAnsicht } from './MaterialAnsicht';
import { StruktogrammAnsicht } from './StruktogrammAnsicht';
import { WeltAnsicht } from './WeltAnsicht';

interface Props {
  programm: Programm;
  lauf: Lauf;
  start: Welt;
  /** Läuft sofort los (nach einer Vorhersage). */
  autoStart?: boolean;
  markiert?: { x: number; y: number } | null;
  titel?: string;
  /** Zeigt zusätzlich das Struktogramm dieser Methode; der gerade ausgeführte Block leuchtet mit. */
  struktogramm?: { methode: string; mitHilfsmethoden?: boolean };
}

/**
 * Spielt einen aufgezeichneten Programmlauf ab: vor, zurück, automatisch.
 * Position 0 ist die Ausgangslage, Position k der Zustand nach dem k-ten Schritt.
 */
export function Stepper({ programm, lauf, start, autoStart, markiert, titel, struktogramm }: Props) {
  const n = lauf.schritte.length;
  const [pos, setPos] = useState(0);
  const [laeuft, setLaeuft] = useState(Boolean(autoStart));
  const [tempo, setTempo] = useState(60);

  // Reine „Anweisung beginnt“-Ereignisse werden übersprungen; angehalten wird bei Bedingungen, Aktionen, Aufrufen, Variablen.
  const halte = useMemo(() => {
    const liste = [0];
    lauf.schritte.forEach((s, i) => {
      if (s.ereignis.art !== 'anweisung') liste.push(i + 1);
    });
    if (liste[liste.length - 1] !== n) liste.push(n);
    return liste;
  }, [lauf, n]);

  const vor = (p: number) => halte.find((h) => h > p) ?? n;
  const zurueck = (p: number) => [...halte].reverse().find((h) => h < p) ?? 0;
  const naechsteAktion = (p: number) => {
    for (let i = p; i < n; i++) {
      const art = lauf.schritte[i].ereignis.art;
      if (art === 'aktion' || art === 'ende') return i + 1;
    }
    return n;
  };

  useEffect(() => {
    if (!laeuft) return;
    if (pos >= n) {
      setLaeuft(false);
      return;
    }
    // Wie der Geschwindigkeitsregler in Greenfoot: links langsam, rechts schnell.
    const pause = Math.round(900 - tempo * 8.6);
    const timer = setTimeout(() => setPos((p) => halte.find((h) => h > p) ?? n), pause);
    return () => clearTimeout(timer);
  }, [laeuft, pos, n, tempo, halte]);

  const schritt = pos > 0 ? lauf.schritte[pos - 1] : null;
  const welt = schritt?.welt ?? start;
  const konsole = lauf.konsole.slice(0, schritt?.konsoleLaenge ?? 0);
  const variablen = [...(schritt?.attribute ?? []), ...(schritt?.rahmen ?? []).flatMap((r) => r.variablen)];
  const amEnde = pos >= n;
  const text = schritt ? beschreibeSchritt(schritt, programm) : 'Ausgangslage';

  return (
    <div className="stepper">
      {titel && <h4>{titel}</h4>}
      <div className="stepper-flaeche">
        <div className="stepper-welt">
          <WeltAnsicht welt={welt} markiert={markiert} />
          <div className="konsole" aria-label="Konsole" aria-live="polite">
            {konsole.length === 0 ? <span className="leise-text">Konsole: keine Meldung</span> : konsole.map((z, i) => <div key={i}>{z}</div>)}
          </div>
          {struktogramm && (
            <div className="stepper-strukto">
              <StruktogrammAnsicht
                programm={programm}
                methode={struktogramm.methode}
                mitHilfsmethoden={struktogramm.mitHilfsmethoden}
                aktiverKnoten={schritt && !amEnde && 'knoten' in schritt.ereignis ? schritt.ereignis.knoten : undefined}
              />
            </div>
          )}
        </div>
        <div className="stepper-code">
          <CodeAnsicht quelltext={programm.quelltext} markierteZeile={schritt && !amEnde ? schritt.zeile : undefined} />
          {variablen.length > 0 && (
            <table className="variablen">
              <caption>Variablen</caption>
              <tbody>
                {variablen.map((v, i) => (
                  <tr key={`${v.name}-${i}`}>
                    <td>
                      {v.name} : {v.typ}
                    </td>
                    <td>{zeigeJavaWert(v.wert)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <p className={`stepper-text${amEnde && lauf.ende.grund !== 'fertig' ? ' warnung' : ''}`} aria-live="polite">
        {amEnde ? endeText(lauf.ende) : text}
      </p>
      <div className="stepper-leiste">
        <button className="mini breit" onClick={() => (setLaeuft(false), setPos(0))} disabled={pos === 0} aria-label="Zum Anfang">
          |◀
        </button>
        <button className="mini breit" onClick={() => (setLaeuft(false), setPos(zurueck(pos)))} disabled={pos === 0} aria-label="Einen Schritt zurück">
          ◀
        </button>
        <button className="knopf klein primaer" onClick={() => (amEnde ? (setPos(0), setLaeuft(true)) : setLaeuft(!laeuft))}>
          {laeuft ? 'Pause' : amEnde ? 'Nochmal abspielen' : 'Abspielen'}
        </button>
        <button className="mini breit" onClick={() => (setLaeuft(false), setPos(vor(pos)))} disabled={amEnde} aria-label="Einen Schritt vor">
          ▶
        </button>
        <button className="knopf klein leise" onClick={() => (setLaeuft(false), setPos(naechsteAktion(pos)))} disabled={amEnde}>
          bis zur nächsten Aktion
        </button>
        <button className="mini breit" onClick={() => (setLaeuft(false), setPos(n))} disabled={amEnde} aria-label="Zum Ende">
          ▶|
        </button>
        <label className="tempo">
          Tempo
          <input type="range" min={1} max={100} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} />
        </label>
        <span className="leise-text">
          {pos} / {n}
        </span>
      </div>
    </div>
  );
}

const SCHWERE: Record<Diagnose['schwere'], string> = {
  fehler: 'Fehler',
  warnung: 'Achtung',
  stil: 'Stil',
  'nicht-unterstuetzt': 'Nicht ausführbar',
};

/** Meldungen des Übersetzers in Schülersprache, mit dem Originalwortlaut des Java-Compilers. */
export function DiagnoseListe({ diagnosen, onZeile }: { diagnosen: Diagnose[]; onZeile?: (zeile: number) => void }) {
  const sichtbar = diagnosen.filter((d) => !d.folgefehler);
  const folge = diagnosen.length - sichtbar.length;
  if (diagnosen.length === 0) return null;
  return (
    <ul className="diagnosen">
      {sichtbar.map((d, i) => (
        <li key={i} className={`diagnose ${d.schwere}`}>
          <button className="diagnose-zeile" onClick={() => onZeile?.(d.pos.zeile)} disabled={!onZeile}>
            Zeile {d.pos.zeile}
          </button>
          <span className="diagnose-inhalt">
            <span>
              <span className="marke">{SCHWERE[d.schwere]}</span> <Inline text={d.text} />
            </span>
            {d.javac && (
              <span className="javac">
                Java-Compiler: <code>{d.javac}</code>
              </span>
            )}
            {d.tipp && (
              <span className="diagnose-tipp">
                Auf Papier: <Inline text={d.tipp} />
              </span>
            )}
          </span>
        </li>
      ))}
      {folge > 0 && <li className="leise-text">… und {folge} weitere Meldung{folge > 1 ? 'en' : ''}, die vermutlich Folgefehler sind. Behebe zuerst die obigen.</li>}
    </ul>
  );
}
