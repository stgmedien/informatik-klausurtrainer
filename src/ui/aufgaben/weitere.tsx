// Klassendiagramm lesen und Freitext mit Erwartungshorizont.
import { useMemo, useState } from 'react';
import { bewerteKlassenLesen, eintraegeKlassenLesen } from '../../lernen/bewertung';
import { KlassenDiagramm } from '../bausteine/KlassenDiagramm';
import { hash, mische } from '../hilfen';
import { useStand } from '../kontext';
import { AbgabeKnopf, type TeilProps } from './einfach';

export function KlassenLesen({ aufgabe, durchgang, fertig, onAbgabe }: TeilProps<'klassen-lesen'>) {
  const eintraege = useMemo(() => mische(eintraegeKlassenLesen(aufgabe), hash(aufgabe.id) + durchgang), [aufgabe, durchgang]);
  const [gewaehlt, setGewaehlt] = useState<ReadonlySet<string>>(new Set());

  const schalte = (schluessel: string) => {
    setGewaehlt((alt) => {
      const neu = new Set(alt);
      if (neu.has(schluessel)) neu.delete(schluessel);
      else neu.add(schluessel);
      return neu;
    });
  };

  const gruppe = (art: 'attribut' | 'methode', titel: string) => {
    const liste = eintraege.filter((e) => e.art === art);
    if (liste.length === 0) return null;
    return (
      <fieldset className="kl-gruppe">
        <legend>{titel}</legend>
        {liste.map((e) => {
          const schluessel = `${e.art}:${e.name}`;
          const an = gewaehlt.has(schluessel);
          const zustand = fertig ? (an === e.besitzt ? 'richtig' : 'falsch') : '';
          return (
            <label key={schluessel} className={`kl-eintrag ${zustand}`}>
              <input type="checkbox" checked={an} disabled={fertig} onChange={() => schalte(schluessel)} />
              <code>{e.art === 'methode' ? `${e.name}()` : e.name}</code>
              {fertig && (
                <span className="kl-herkunft">
                  {e.besitzt ? (e.von === aufgabe.objektDerKlasse ? 'eigene Klasse' : `geerbt von ${e.von}`) : 'gehört nicht dazu'}
                </span>
              )}
            </label>
          );
        })}
      </fieldset>
    );
  };

  return (
    <div>
      <KlassenDiagramm modell={aufgabe.modell} markiert={aufgabe.objektDerKlasse} />
      <p className="hilfstext">
        Kreuze alles an, was ein Objekt der Klasse <code>{aufgabe.objektDerKlasse}</code> besitzt.
      </p>
      <div className="kl-gruppen">
        {gruppe('attribut', 'Attribute')}
        {gruppe('methode', 'Methoden')}
      </div>
      {!fertig && <AbgabeKnopf aktiv={gewaehlt.size > 0} onClick={() => onAbgabe({ ...bewerteKlassenLesen(aufgabe, gewaehlt), quelle: 'automatisch' })} />}
    </div>
  );
}

type Urteil = 'ja' | 'teil' | 'nein';

/**
 * Freitext: erst schreiben, dann mit Musterantwort und Erwartungshorizont vergleichen.
 * Die Selbsteinschätzung je Kriterium ergibt die Punkte.
 */
export function Freitext({ aufgabe, fertig, onAbgabe }: TeilProps<'freitext'>) {
  const { stand, aendere } = useStand();
  const [text, setText] = useState(stand.antworten[aufgabe.id] ?? '');
  const [phase, setPhase] = useState<'schreiben' | 'pruefen'>('schreiben');
  const [urteile, setUrteile] = useState<Readonly<Record<string, Urteil>>>({});
  const kriterien = aufgabe.erwartung.kriterien;
  const woerter = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  const zurPruefung = () => {
    aendere((s) => ({ ...s, antworten: { ...s.antworten, [aufgabe.id]: text } }));
    setPhase('pruefen');
  };

  const speichere = () => {
    const punkte = kriterien.reduce((summe, k) => summe + (urteile[k.id] === 'ja' ? k.punkte : urteile[k.id] === 'teil' ? k.punkte / 2 : 0), 0);
    onAbgabe({ punkte, max: aufgabe.punkte, quelle: 'selbst' });
  };

  if (phase === 'schreiben' && !fertig) {
    return (
      <div>
        <textarea
          className="freitext"
          rows={aufgabe.zeilen ?? 6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Schreibe deine Antwort in ganzen Sätzen – so, wie du sie in der Klausur aufs Papier bringen würdest."
          spellCheck
          lang="de"
        />
        <p className="hilfstext">
          {woerter} {woerter === 1 ? 'Wort' : 'Wörter'} · {aufgabe.punkte} Punkte: Für jeden Punkt wird ein eigener Gedanke erwartet.
        </p>
        <AbgabeKnopf aktiv={woerter >= 3} onClick={zurPruefung} text="Abgeben und vergleichen" />
      </div>
    );
  }

  return (
    <div className="freitext-pruefung">
      <div className="spalten">
        <section>
          <h4>Deine Antwort</h4>
          <p className="eigene-antwort">{text}</p>
        </section>
        <section>
          <h4>Musterantwort</h4>
          <p className="musterantwort">{aufgabe.erwartung.musterantwort}</p>
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
      {aufgabe.erwartung.fachbegriffe && (
        <p className="fachbegriffe">
          <strong>Fachbegriffe, die vorkommen sollten:</strong>{' '}
          {aufgabe.erwartung.fachbegriffe.map((f) => (
            <span key={f} className={`fachbegriff${text.toLowerCase().includes(f.toLowerCase()) ? ' drin' : ''}`}>
              {f}
            </span>
          ))}
        </p>
      )}
      {!fertig && <AbgabeKnopf aktiv={kriterien.every((k) => urteile[k.id])} onClick={speichere} text="Einschätzung speichern" />}
    </div>
  );
}
