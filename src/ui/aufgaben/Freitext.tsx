import { type ReactNode, useEffect, useState } from 'react';
import type { KorrekturErgebnis, Urteil as KiUrteil } from '../../../server/ki/typen';
import type { Aufgabe, Erwartungshorizont } from '../../inhalte/typen';
import { baueKorrekturAnfrage, punkteAusUrteilen } from '../../lernen/korrektur';
import { korrigiere } from '../ki';
import { useStand } from '../kontext';
import { type Abgabe, AbgabeKnopf, type TeilProps } from './einfach';

type Urteil = 'ja' | 'teil' | 'nein';

const KI_ZEICHEN: Record<KiUrteil, { zeichen: string; name: string; klasse: string }> = {
  erfuellt: { zeichen: '✓', name: 'steht da', klasse: 'ja' },
  teilweise: { zeichen: '◐', name: 'teilweise', klasse: 'teil' },
  nicht: { zeichen: '✗', name: 'fehlt', klasse: 'nein' },
};

interface VergleichProps {
  aufgabe: Aufgabe;
  erwartung: Erwartungshorizont;
  /** Die Antwort als Text – so geht sie an die KI. */
  antwort: string;
  /** Wie die Antwort angezeigt wird (z.B. als Klassendiagramm); sonst als Text. */
  antwortAnsicht?: ReactNode;
  mitKi: boolean;
  fertig: boolean;
  onAbgabe: (a: Abgabe) => void;
}

/**
 * Bewertung nach Erwartungshorizont: Mit KI wird jedes Kriterium von der KI beurteilt;
 * ohne KI (oder bei einem Fehler) schätzt man sich selbst ein. Die Punkte rechnet immer die App aus.
 */
export function ErwartungsVergleich({ aufgabe, erwartung, antwort, antwortAnsicht, mitKi, fertig, onAbgabe }: VergleichProps) {
  const { stand } = useStand();
  const [phase, setPhase] = useState<'ki-laeuft' | 'ki-ergebnis' | 'selbst'>(mitKi ? 'ki-laeuft' : 'selbst');
  const [urteile, setUrteile] = useState<Readonly<Record<string, Urteil>>>({});
  const [korrektur, setKorrektur] = useState<KorrekturErgebnis | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [musterOffen, setMusterOffen] = useState(false);
  const kriterien = erwartung.kriterien;

  useEffect(() => {
    if (!mitKi) return;
    let aktiv = true;
    korrigiere(baueKorrekturAnfrage(aufgabe, erwartung, antwort, stand))
      .then((ergebnis) => {
        if (!aktiv) return;
        setKorrektur(ergebnis);
        setPhase('ki-ergebnis');
        onAbgabe({ punkte: punkteAusUrteilen(erwartung, ergebnis.kriterien), max: aufgabe.punkte, quelle: 'ki' });
      })
      .catch((e: unknown) => {
        if (!aktiv) return;
        setFehler(e instanceof Error ? e.message : 'Die KI-Korrektur ist fehlgeschlagen.');
        setPhase('selbst');
      });
    return () => {
      aktiv = false;
    };
    // Die Korrektur läuft genau einmal, wenn die Antwort abgegeben wurde.
  }, []);

  const eigene = antwortAnsicht ?? <p className="eigene-antwort">{antwort}</p>;
  const fachbegriffe = erwartung.fachbegriffe && (
    <p className="fachbegriffe">
      <strong>Fachbegriffe, die vorkommen sollten:</strong>{' '}
      {erwartung.fachbegriffe.map((f) => (
        <span key={f} className={`fachbegriff${antwort.toLowerCase().includes(f.toLowerCase()) ? ' drin' : ''}`}>
          {f}
        </span>
      ))}
    </p>
  );

  if (phase === 'ki-laeuft') {
    return (
      <div className="ki-wartet" role="status">
        <span className="kreisel" aria-hidden="true" />
        Deine Antwort wird korrigiert … das dauert einige Sekunden.
        {eigene}
      </div>
    );
  }

  if (phase === 'ki-ergebnis' && korrektur) {
    const nachId = new Map(korrektur.kriterien.map((k) => [k.id, k]));
    return (
      <div className="freitext-pruefung">
        <h4>Deine Antwort</h4>
        {eigene}
        <h4>Korrektur nach Erwartungshorizont</h4>
        <ul className="kriterien ki">
          {kriterien.map((k) => {
            const u = nachId.get(k.id);
            const z = KI_ZEICHEN[u?.urteil ?? 'nicht'];
            return (
              <li key={k.id} className={`urteil-zeile ${z.klasse}`}>
                <span className="urteil-zeichen" title={z.name} aria-label={z.name}>
                  {z.zeichen}
                </span>
                <span className="kr-text">
                  {k.text} <span className="kr-punkte">({k.punkte} P.)</span>
                  <span className="kr-begruendung">{u?.begruendung}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <dl className="ki-rueckmeldung">
          <dt>Operator</dt>
          <dd>
            <span className={`marke ${korrektur.operatorGetroffen ? 'grad-3' : 'grad-1'}`}>{korrektur.operatorGetroffen ? 'getroffen' : 'noch nicht getroffen'}</span>{' '}
            {korrektur.operatorHinweis}
          </dd>
          <dt>Fachsprache</dt>
          <dd>{korrektur.fachsprache}</dd>
          {korrektur.sprachhinweise.length > 0 && (
            <>
              <dt>Sprache</dt>
              <dd>
                <ul>
                  {korrektur.sprachhinweise.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
                <span className="leise-text">Ohne Punktwert – gehäufte Sprachfehler können in der Klausur aber die Note senken.</span>
              </dd>
            </>
          )}
          <dt>Nächster Schritt</dt>
          <dd>
            <strong>{korrektur.naechsterSchritt}</strong>
          </dd>
        </dl>
        {fachbegriffe}
        <button className="textknopf" onClick={() => setMusterOffen(!musterOffen)} aria-expanded={musterOffen}>
          {musterOffen ? 'Musterantwort ausblenden' : 'Musterantwort zeigen'}
        </button>
        {musterOffen && <p className="musterantwort">{erwartung.musterantwort}</p>}
        <p className="leise-text ki-vermerk">Einschätzung der KI ({korrektur.modell}) – in der Klausur entscheidet deine Lehrkraft.</p>
      </div>
    );
  }

  const speichereSelbst = () => {
    const punkte = kriterien.reduce((summe, k) => summe + (urteile[k.id] === 'ja' ? k.punkte : urteile[k.id] === 'teil' ? k.punkte / 2 : 0), 0);
    onAbgabe({ punkte, max: aufgabe.punkte, quelle: 'selbst' });
  };

  return (
    <div className="freitext-pruefung">
      {fehler && (
        <p className="meldung falsch" role="alert">
          {fehler} Vergleiche deine Antwort stattdessen selbst mit dem Erwartungshorizont.
        </p>
      )}
      <div className="spalten">
        <section>
          <h4>Deine Antwort</h4>
          {eigene}
        </section>
        <section>
          <h4>Musterantwort</h4>
          <p className="musterantwort">{erwartung.musterantwort}</p>
        </section>
      </div>
      <h4>Erwartungshorizont – was steht in deiner Antwort?</h4>
      <p className="hilfstext">Sei streng wie eine Lehrkraft: Es zählt nur, was wirklich dasteht – sinngemäß, mit den Fachbegriffen.</p>
      <ul className="kriterien">
        {kriterien.map((k) => (
          <li key={k.id}>
            <span className="kr-text">
              {k.text} <span className="kr-punkte">({k.punkte} P.)</span>
            </span>
            <span className="chips" role="group" aria-label={`Einschätzung: ${k.text}`}>
              {(
                [
                  ['ja', 'steht da'],
                  ['teil', 'teilweise'],
                  ['nein', 'fehlt'],
                ] as const
              ).map(([wert, name]) => (
                <button
                  key={wert}
                  className={`chip urteil-${wert}${urteile[k.id] === wert ? ' an' : ''}`}
                  disabled={fertig}
                  aria-pressed={urteile[k.id] === wert}
                  onClick={() => setUrteile((alt) => ({ ...alt, [k.id]: wert }))}
                >
                  {name}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {fachbegriffe}
      {!fertig && <AbgabeKnopf aktiv={kriterien.every((k) => urteile[k.id])} onClick={speichereSelbst} text="Einschätzung speichern" />}
    </div>
  );
}

/** Freitext: erst schreiben, dann nach Erwartungshorizont bewerten (mit KI oder selbst). */
export function Freitext({ aufgabe, fertig, onAbgabe, onEntwurf }: TeilProps<'freitext'>) {
  const { stand, aendere, ki } = useStand();
  const [text, setText] = useState(stand.antworten[aufgabe.id] ?? '');
  const [abgegeben, setAbgegeben] = useState<null | { mitKi: boolean }>(null);
  const woerter = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  // Ein früher gespeicherter Entwurf steht schon im Feld; der Tutor soll ihn ebenfalls kennen.
  useEffect(() => {
    onEntwurf?.(text);
  }, []);

  const abgeben = (mitKi: boolean) => {
    aendere((s) => ({ ...s, antworten: { ...s.antworten, [aufgabe.id]: text } }));
    setAbgegeben({ mitKi });
  };

  if (abgegeben) {
    return <ErwartungsVergleich aufgabe={aufgabe} erwartung={aufgabe.erwartung} antwort={text} mitKi={abgegeben.mitKi} fertig={fertig} onAbgabe={onAbgabe} />;
  }

  return (
    <div>
      <textarea
        className="freitext"
        rows={aufgabe.zeilen ?? 6}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onEntwurf?.(e.target.value);
        }}
        placeholder="Schreibe deine Antwort in ganzen Sätzen – so, wie du sie in der Klausur aufs Papier bringen würdest."
        spellCheck
        lang="de"
      />
      <p className="hilfstext">
        {woerter} {woerter === 1 ? 'Wort' : 'Wörter'} · {aufgabe.punkte} Punkte: Für jeden Punkt wird ein eigener Gedanke erwartet.
      </p>
      <AbgabeLeiste aktiv={woerter >= 3} mitKi={ki.verfuegbar} onAbgabe={abgeben} />
    </div>
  );
}

export function AbgabeLeiste({ aktiv, mitKi, onAbgabe }: { aktiv: boolean; mitKi: boolean; onAbgabe: (mitKi: boolean) => void }) {
  if (!mitKi) return <AbgabeKnopf aktiv={aktiv} onClick={() => onAbgabe(false)} text="Abgeben und vergleichen" />;
  return (
    <div className="abgabe-leiste knopfreihe">
      <button className="knopf primaer" disabled={!aktiv} onClick={() => onAbgabe(true)}>
        Abgeben und korrigieren lassen
      </button>
      <button className="textknopf" disabled={!aktiv} onClick={() => onAbgabe(false)}>
        lieber selbst mit dem Erwartungshorizont vergleichen
      </button>
    </div>
  );
}
