// Aufgabentypen mit festem Lösungsschlüssel: Auswahl, Zuordnen, Reihenfolge, Lücken.
import { Fragment, useMemo, useState } from 'react';
import type { Aufgabe } from '../../inhalte/typen';
import { bewerteAuswahl, bewerteLuecken, bewerteReihenfolge, bewerteZuordnen, lueckeRichtig } from '../../lernen/bewertung';
import { Markdown } from '../Markdown';
import { hash, mische, mischeAnders } from '../hilfen';

export interface Abgabe {
  punkte: number;
  max: number;
  quelle: 'automatisch' | 'selbst' | 'ki';
  /** Erkannte Fehlermuster (Katalog-IDs) für das Fehlerheft. */
  muster?: string[];
}

export interface TeilProps<T extends Aufgabe['typ']> {
  aufgabe: Extract<Aufgabe, { typ: T }>;
  /** Zählt Wiederholungen derselben Aufgabe hoch, damit neu gemischt wird. */
  durchgang: number;
  fertig: boolean;
  onAbgabe: (abgabe: Abgabe) => void;
  /** Meldet den aktuellen Entwurf nach oben, damit der Tutor sich darauf beziehen kann. */
  onEntwurf?: (text: string) => void;
}

export function AbgabeKnopf({ aktiv, onClick, text = 'Abgeben' }: { aktiv: boolean; onClick: () => void; text?: string }) {
  return (
    <div className="abgabe-leiste">
      <button className="knopf primaer" disabled={!aktiv} onClick={onClick}>
        {text}
      </button>
    </div>
  );
}

export function Auswahl({ aufgabe, durchgang, fertig, onAbgabe }: TeilProps<'auswahl'>) {
  const folge = useMemo(() => mische(aufgabe.optionen.map((_, i) => i), hash(aufgabe.id) + durchgang), [aufgabe, durchgang]);
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<number>>(new Set());

  const schalte = (i: number) => {
    if (fertig) return;
    if (!aufgabe.mehrfach) return setGewaehlt(new Set([i]));
    setGewaehlt((alt) => {
      const neu = new Set(alt);
      if (neu.has(i)) neu.delete(i);
      else neu.add(i);
      return neu;
    });
  };

  return (
    <div>
      <p className="hilfstext">{aufgabe.mehrfach ? 'Mehrere Antworten können richtig sein.' : 'Genau eine Antwort ist richtig.'}</p>
      <ul className="optionen">
        {folge.map((i) => {
          const o = aufgabe.optionen[i];
          const an = gewaehlt.has(i);
          const zustand = fertig ? (o.richtig === an ? 'richtig' : 'falsch') : '';
          return (
            <li key={i} className={`option ${an ? 'gewaehlt' : ''} ${zustand}`}>
              <label>
                <input type={aufgabe.mehrfach ? 'checkbox' : 'radio'} name={aufgabe.id} checked={an} disabled={fertig} onChange={() => schalte(i)} />
                <Markdown text={o.text} />
              </label>
              {fertig && (
                <p className="warum">
                  <strong>{o.richtig ? 'Trifft zu.' : 'Trifft nicht zu.'}</strong> {o.warum}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {!fertig && <AbgabeKnopf aktiv={gewaehlt.size > 0} onClick={() => onAbgabe({ ...bewerteAuswahl(aufgabe, gewaehlt), quelle: 'automatisch' })} />}
    </div>
  );
}

export function Zuordnen({ aufgabe, durchgang, fertig, onAbgabe }: TeilProps<'zuordnen'>) {
  const folge = useMemo(() => mische(aufgabe.elemente.map((_, i) => i), hash(aufgabe.id) + durchgang), [aufgabe, durchgang]);
  const [wahl, setWahl] = useState<Readonly<Record<number, string>>>({});
  const vollstaendig = Object.keys(wahl).length === aufgabe.elemente.length;

  return (
    <div>
      <ul className="zuordnen">
        {folge.map((i) => {
          const e = aufgabe.elemente[i];
          const richtig = wahl[i] === e.kategorie;
          return (
            <li key={i} className={fertig ? (richtig ? 'richtig' : 'falsch') : ''}>
              <span className={`zu-text${/\w\(\)|;|^\/\/|^(public|private|import|class)\b/.test(e.text) ? ' code' : ''}`}>{e.text}</span>
              <span className="chips" role="group" aria-label={`Kategorie für ${e.text}`}>
                {aufgabe.kategorien.map((k) => (
                  <button
                    key={k}
                    className={`chip${wahl[i] === k ? ' an' : ''}${fertig && k === e.kategorie ? ' loesung' : ''}`}
                    disabled={fertig}
                    aria-pressed={wahl[i] === k}
                    onClick={() => setWahl((alt) => ({ ...alt, [i]: k }))}
                  >
                    {k}
                  </button>
                ))}
              </span>
              {fertig && !richtig && e.warum && <p className="warum">{e.warum}</p>}
            </li>
          );
        })}
      </ul>
      {!fertig && <AbgabeKnopf aktiv={vollstaendig} onClick={() => onAbgabe({ ...bewerteZuordnen(aufgabe, wahl), quelle: 'automatisch' })} />}
    </div>
  );
}

export function Reihenfolge({ aufgabe, durchgang, fertig, onAbgabe }: TeilProps<'reihenfolge'>) {
  const [folge, setFolge] = useState(() => mischeAnders(aufgabe.elemente, hash(aufgabe.id) + durchgang));

  const schiebe = (i: number, richtung: -1 | 1) => {
    const j = i + richtung;
    if (j < 0 || j >= folge.length) return;
    const neu = [...folge];
    [neu[i], neu[j]] = [neu[j], neu[i]];
    setFolge(neu);
  };

  return (
    <div>
      <ol className="reihenfolge">
        {folge.map((text, i) => (
          <li key={text} className={fertig ? (aufgabe.elemente[i] === text ? 'richtig' : 'falsch') : ''}>
            <span className="rf-text">{text}</span>
            {!fertig && (
              <span className="rf-knoepfe">
                <button className="mini" disabled={i === 0} onClick={() => schiebe(i, -1)} aria-label={`„${text}“ nach oben`}>
                  ▲
                </button>
                <button className="mini" disabled={i === folge.length - 1} onClick={() => schiebe(i, 1)} aria-label={`„${text}“ nach unten`}>
                  ▼
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {fertig && (
        <div className="loesung-kasten">
          <strong>Richtige Reihenfolge:</strong>
          <ol>
            {aufgabe.elemente.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ol>
          {aufgabe.erklaerung && <p>{aufgabe.erklaerung}</p>}
        </div>
      )}
      {!fertig && <AbgabeKnopf aktiv onClick={() => onAbgabe({ ...bewerteReihenfolge(aufgabe, folge), quelle: 'automatisch' })} />}
    </div>
  );
}

export function Luecke({ aufgabe, fertig, onAbgabe }: TeilProps<'luecke'>) {
  const [eingaben, setEingaben] = useState<Readonly<Record<string, string>>>({});
  const teile = useMemo(() => aufgabe.vorlage.split(/(\{\{\w+\}\})/), [aufgabe]);
  const ids = Object.keys(aufgabe.luecken);
  const falsche = fertig ? ids.filter((id) => !lueckeRichtig(aufgabe, id, eingaben[id] ?? '')) : [];

  return (
    <div>
      <div className={`luecken${aufgabe.code ? ' code' : ''}`}>
        {teile.map((teil, i) => {
          const treffer = /^\{\{(\w+)\}\}$/.exec(teil);
          if (!treffer) return <Fragment key={i}>{teil}</Fragment>;
          const id = treffer[1];
          const laenge = Math.max(...aufgabe.luecken[id].akzeptiert.map((a) => a.length));
          const zustand = fertig ? (falsche.includes(id) ? 'falsch' : 'richtig') : '';
          return (
            <input
              key={i}
              className={`luecke ${zustand}`}
              style={{ width: `${Math.max(3, laenge + 2)}ch` }}
              value={eingaben[id] ?? ''}
              disabled={fertig}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label={`Lücke ${ids.indexOf(id) + 1}`}
              onChange={(e) => setEingaben((alt) => ({ ...alt, [id]: e.target.value }))}
            />
          );
        })}
      </div>
      {fertig && falsche.length > 0 && (
        <div className="loesung-kasten">
          <strong>Korrektur:</strong>
          <ul>
            {falsche.map((id) => (
              <li key={id}>
                Lücke {ids.indexOf(id) + 1}: <code>{aufgabe.luecken[id].akzeptiert[0]}</code>
                {eingaben[id] ? (
                  <>
                    {' '}
                    statt <code className="durchgestrichen">{eingaben[id]}</code>
                  </>
                ) : (
                  ' (leer gelassen)'
                )}
                {aufgabe.luecken[id].erklaerung && <> – {aufgabe.luecken[id].erklaerung}</>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {fertig &&
        falsche.length === 0 &&
        ids
          .filter((id) => aufgabe.luecken[id].erklaerung)
          .map((id) => (
            <p key={id} className="warum">
              <code>{aufgabe.luecken[id].akzeptiert[0]}</code> – {aufgabe.luecken[id].erklaerung}
            </p>
          ))}
      {!fertig && (
        <AbgabeKnopf
          aktiv={ids.some((id) => (eingaben[id] ?? '').trim() !== '')}
          onClick={() => onAbgabe({ ...bewerteLuecken(aufgabe, eingaben), quelle: 'automatisch' })}
        />
      )}
    </div>
  );
}
