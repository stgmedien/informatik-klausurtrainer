import { useMemo, useState } from 'react';
import { MELDUNG_GEKLATSCHT, MELDUNG_HINDERNIS, MELDUNG_KEINE_FLIEGE, MELDUNG_NICHTS_GEFRESSEN } from '../../engine/welt';
import type { VorhersageFrage } from '../../inhalte/typen';
import { baueWelt, richtungsName } from '../../lernen/ausfuehren';
import { type VorhersageAntwort, loeseVorhersage, pruefeVorhersage } from '../../lernen/bewertung';
import { Markdown } from '../Markdown';
import { CodeAnsicht } from '../bausteine/MaterialAnsicht';
import { Stepper } from '../bausteine/Stepper';
import { WeltAnsicht } from '../bausteine/WeltAnsicht';
import { AbgabeKnopf, type TeilProps } from './einfach';

const MELDUNGEN = [MELDUNG_HINDERNIS, MELDUNG_GEKLATSCHT, MELDUNG_KEINE_FLIEGE, MELDUNG_NICHTS_GEFRESSEN];
const RICHTUNGEN = [
  { wert: 0, zeichen: '→' },
  { wert: 90, zeichen: '↓' },
  { wert: 180, zeichen: '←' },
  { wert: 270, zeichen: '↑' },
];

/**
 * Erst festlegen, dann ausführen: Der Programmlauf wird erst nach der Abgabe gezeigt.
 * Das trainiert den Schreibtischtest, den die Klausur verlangt.
 */
export function Vorhersage({ aufgabe, fertig, onAbgabe }: TeilProps<'vorhersage'>) {
  const start = useMemo(() => baueWelt(aufgabe.welt), [aufgabe]);
  const [antwort, setAntwort] = useState<VorhersageAntwort>({});
  const [geloest, setGeloest] = useState<ReturnType<typeof loeseVorhersage> | null>(null);
  const fragt = (f: VorhersageFrage) => aufgabe.fragen.includes(f);
  const setze = (teil: Partial<VorhersageAntwort>) => setAntwort((alt) => ({ ...alt, ...teil }));

  const beantwortet: Record<VorhersageFrage, boolean> = {
    feld: antwort.feld !== undefined,
    richtung: antwort.richtung !== undefined,
    gefressen: antwort.gefressen !== undefined,
    meldung: antwort.meldung !== undefined,
    endet: antwort.endet !== undefined,
  };
  const vollstaendig = aufgabe.fragen.every((f) => beantwortet[f]);

  const abgeben = () => {
    const ergebnis = loeseVorhersage(aufgabe);
    setGeloest(ergebnis);
    const richtig = pruefeVorhersage(antwort, ergebnis.loesung);
    const treffer = aufgabe.fragen.filter((f) => richtig[f]).length;
    onAbgabe({ punkte: Math.round((treffer / aufgabe.fragen.length) * aufgabe.punkte * 2) / 2, max: aufgabe.punkte, quelle: 'automatisch' });
  };

  const richtig = geloest ? pruefeVorhersage(antwort, geloest.loesung) : null;
  const zustand = (f: VorhersageFrage) => (richtig ? (richtig[f] ? ' richtig' : ' falsch') : '');
  const l = geloest?.loesung;

  return (
    <div className="vorhersage">
      <div className="vorhersage-material">
        <CodeAnsicht quelltext={aufgabe.quelltext} titel={`Aufgerufen wird ${aufgabe.methode}()`} />
        <figure className="material">
          <figcaption>Ausgangslage{fragt('feld') && !fertig ? ' – klicke das Feld an, auf dem die Tarantel am Ende steht' : ''}</figcaption>
          <WeltAnsicht welt={start} markiert={antwort.feld} onFeld={fragt('feld') && !fertig ? (x, y) => setze({ feld: { x, y } }) : undefined} />
        </figure>
      </div>

      <div className="vorhersage-fragen">
        {fragt('endet') && (
          <div className={`vf${zustand('endet')}`}>
            <span className="vf-frage">Endet die Methode?</span>
            <span className="chips">
              {[
                [true, 'ja, sie endet'],
                [false, 'nein, Endlosschleife'],
              ].map(([wert, name]) => (
                <button key={String(wert)} className={`chip${antwort.endet === wert ? ' an' : ''}`} disabled={fertig} aria-pressed={antwort.endet === wert} onClick={() => setze({ endet: wert as boolean })}>
                  {name}
                </button>
              ))}
            </span>
            {l && <span className="vf-loesung">{l.endet ? 'Die Methode endet.' : 'Die Methode endet nie.'}</span>}
          </div>
        )}
        {fragt('feld') && (
          <div className={`vf${zustand('feld')}`}>
            <span className="vf-frage">Endfeld der Tarantel</span>
            <span>{antwort.feld ? `(${antwort.feld.x}|${antwort.feld.y})` : 'noch kein Feld gewählt'}</span>
            {l && <span className="vf-loesung">Tatsächlich: ({l.feld[0]}|{l.feld[1]})</span>}
          </div>
        )}
        {fragt('richtung') && (
          <div className={`vf${zustand('richtung')}`}>
            <span className="vf-frage">Blickrichtung am Ende</span>
            <span className="chips">
              {RICHTUNGEN.map((r) => (
                <button key={r.wert} className={`chip${antwort.richtung === r.wert ? ' an' : ''}`} disabled={fertig} aria-pressed={antwort.richtung === r.wert} onClick={() => setze({ richtung: r.wert })}>
                  {r.zeichen} {richtungsName(r.wert)}
                </button>
              ))}
            </span>
            {l && <span className="vf-loesung">Tatsächlich: nach {richtungsName(l.richtung)}</span>}
          </div>
        )}
        {fragt('gefressen') && (
          <div className={`vf${zustand('gefressen')}`}>
            <label className="vf-frage" htmlFor={`${aufgabe.id}-gefressen`}>
              Gefressene Fliegen am Ende
            </label>
            <input
              id={`${aufgabe.id}-gefressen`}
              className="zahl"
              type="number"
              min={0}
              max={99}
              disabled={fertig}
              value={antwort.gefressen ?? ''}
              onChange={(e) => setze({ gefressen: e.target.value === '' ? undefined : Number(e.target.value) })}
            />
            {l && <span className="vf-loesung">Tatsächlich: {l.gefressen}</span>}
          </div>
        )}
        {fragt('meldung') && (
          <div className={`vf${zustand('meldung')}`}>
            <span className="vf-frage">Meldung in der Konsole</span>
            <span className="chips spalte">
              {[null, ...MELDUNGEN].map((m) => (
                <button key={m ?? 'keine'} className={`chip${antwort.meldung === m ? ' an' : ''}`} disabled={fertig} aria-pressed={antwort.meldung === m} onClick={() => setze({ meldung: m })}>
                  {m ?? 'keine Meldung'}
                </button>
              ))}
            </span>
            {l && <span className="vf-loesung">Tatsächlich: {l.meldung ?? 'keine Meldung'}</span>}
          </div>
        )}
      </div>

      {!fertig && <AbgabeKnopf aktiv={vollstaendig} onClick={abgeben} text="Festlegen und ausführen" />}

      {geloest && (
        <>
          <Markdown text={aufgabe.erklaerung} klasse="erklaerung" />
          <Stepper programm={geloest.ausfuehrung.programm} lauf={geloest.ausfuehrung.lauf} start={geloest.ausfuehrung.start} autoStart markiert={antwort.feld} titel="So läuft das Programm tatsächlich ab" />
        </>
      )}
    </div>
  );
}
