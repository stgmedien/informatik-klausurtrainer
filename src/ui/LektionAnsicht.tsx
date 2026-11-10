import { useState } from 'react';
import type { Merksatz } from '../inhalte';
import type { Lektion } from '../inhalte/typen';
import { heute } from '../lernen/stand';
import { Markdown } from './Markdown';
import { MaterialAnsicht } from './bausteine/MaterialAnsicht';
import { useStand } from './kontext';

/** Merksatz mit Quelle. Der Wortlaut lässt sich durch die Formulierung aus dem eigenen Heft ersetzen. */
export function MerksatzKasten({ merksatz }: { merksatz: Merksatz }) {
  const { stand, aendere } = useStand();
  const eigener = stand.merksaetze[merksatz.id];
  const [offen, setOffen] = useState(false);
  const [entwurf, setEntwurf] = useState(eigener ?? merksatz.text);

  const speichere = (text: string | null) => {
    aendere((s) => {
      const merksaetze = { ...s.merksaetze };
      if (text === null || text.trim() === '' || text.trim() === merksatz.text) delete merksaetze[merksatz.id];
      else merksaetze[merksatz.id] = text.trim();
      return { ...s, merksaetze };
    });
    setOffen(false);
  };

  return (
    <aside className={`merksatz${merksatz.abgleichen ? ' abgleichen' : ''}`}>
      <div className="merksatz-kopf">
        <strong>{merksatz.titel}</strong>
        {eigener && <span className="marke eigen">dein Wortlaut</span>}
        {merksatz.abgleichen && !eigener && <span className="marke warnung">nicht aus dem Unterrichtsmaterial – bitte mit dem Heft abgleichen</span>}
      </div>
      {offen ? (
        <div className="merksatz-bearbeiten">
          <textarea rows={4} value={entwurf} onChange={(e) => setEntwurf(e.target.value)} aria-label={`Eigener Wortlaut für ${merksatz.titel}`} />
          <div className="knopfreihe">
            <button className="knopf primaer klein" onClick={() => speichere(entwurf)}>
              Speichern
            </button>
            <button
              className="knopf leise klein"
              onClick={() => {
                setEntwurf(merksatz.text);
                speichere(null);
              }}
            >
              Vorgabe wiederherstellen
            </button>
            <button className="knopf leise klein" onClick={() => setOffen(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <p>{eigener ?? merksatz.text}</p>
      )}
      <div className="merksatz-fuss">
        <span className="quelle">Quelle: {merksatz.quelle}</span>
        {!offen && (
          <button className="textknopf" onClick={() => setOffen(true)}>
            Wortlaut aus dem Heft eintragen
          </button>
        )}
      </div>
    </aside>
  );
}

export function LektionAnsicht({ lektion, onWeiter, weiterText = 'Verstanden – weiter' }: { lektion: Lektion; onWeiter?: () => void; weiterText?: string }) {
  const { stand, aendere } = useStand();
  const abgeglichen = Boolean(stand.heftAbgleich[lektion.id]);

  const weiter = () => {
    aendere((s) => ({ ...s, gelesen: { ...s.gelesen, [lektion.id]: heute() } }));
    onWeiter?.();
  };

  return (
    <article className="lektion">
      <header className="aufgabe-kopf">
        <h2>{lektion.titel}</h2>
        <div className="marken">
          <span className="marke">Kurz erklärt</span>
          <span className="marke">ca. {lektion.minuten} min</span>
        </div>
      </header>
      {lektion.abschnitte.map((a, i) => {
        if (a.art === 'text') return <Markdown key={i} text={a.markdown} />;
        if (a.art === 'material') return <MaterialAnsicht key={i} material={a.material} />;
        return <MerksatzKasten key={a.id} merksatz={a} />;
      })}
      <footer className="aufgabe-fuss">
        <label className="heft">
          <input
            type="checkbox"
            checked={abgeglichen}
            onChange={(e) => aendere((s) => ({ ...s, heftAbgleich: { ...s.heftAbgleich, [lektion.id]: e.target.checked } }))}
          />
          Stimmt mit meinem Heft überein
        </label>
        {onWeiter && (
          <button className="knopf primaer" onClick={weiter}>
            {weiterText}
          </button>
        )}
      </footer>
    </article>
  );
}
