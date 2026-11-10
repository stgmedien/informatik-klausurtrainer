import { AUFGABEN, BEREICHE, KANNLISTE, LEKTIONEN, TYP_NAMEN, aufgabenFuerKann, kannItem, lektionenFuerKann } from '../../inhalte';
import type { Bereich } from '../../inhalte/typen';
import { GRAD_NAMEN, istRichtig, kannStand, letzterVersuch } from '../../lernen/stand';
import type { Ansicht, GeheZu } from '../ansicht';
import { punkteText } from '../hilfen';
import { useStand } from '../kontext';
import { GradBalken } from './Heute';

export function Kannliste({ geheZu }: { geheZu: GeheZu }) {
  const { stand } = useStand();
  return (
    <div className="seite">
      <header className="seitenkopf">
        <h1>Kann-Liste</h1>
        <p>
          Jede Zeile ist eine Aussage aus der Kann-Liste deiner Lehrkraft. <strong>Klausurfest</strong> ist ein Lernziel, wenn du es an zwei
          verschiedenen Tagen ohne Hinweis geschafft hast – davon einmal im Klausurformat.
        </p>
        <GradBalken />
      </header>
      {BEREICHE.map((b) => (
        <section key={b.id} className="karte">
          <h3>
            <span className="bereich-nr">{b.id}</span> {b.titel}
          </h3>
          <ul className="kann-liste">
            {KANNLISTE.filter((k) => k.bereich === b.id).map((k) => {
              const s = kannStand(stand, k.id);
              const anzahl = aufgabenFuerKann(k.id).length;
              return (
                <li key={k.id}>
                  <span className={`marke grad-${s.grad}`}>{GRAD_NAMEN[s.grad]}</span>
                  <span className="kann-text">Ich kann {k.text}</span>
                  {anzahl > 0 ? (
                    <button className="knopf leise klein" onClick={() => geheZu({ seite: 'ueben', kann: k.id })}>
                      Üben ({anzahl})
                    </button>
                  ) : (
                    <span className="leise-text">in Vorbereitung</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function Ueben({ ansicht, geheZu }: { ansicht: Extract<Ansicht, { seite: 'ueben' }>; geheZu: GeheZu }) {
  const { stand } = useStand();
  const kann = ansicht.kann ? kannItem(ansicht.kann) : undefined;
  const bereich: Bereich = kann?.bereich ?? ansicht.bereich ?? '1';
  const lektionen = kann ? lektionenFuerKann(kann.id) : LEKTIONEN.filter((l) => l.kann.some((id) => kannItem(id)?.bereich === bereich));
  const aufgaben = kann ? aufgabenFuerKann(kann.id) : AUFGABEN.filter((a) => a.kann.some((id) => kannItem(id)?.bereich === bereich));

  return (
    <div className="seite">
      <header className="seitenkopf">
        <h1>Üben nach Thema</h1>
        <nav className="chips" aria-label="Themenbereich">
          {BEREICHE.map((b) => (
            <button
              key={b.id}
              className={`chip${!kann && b.id === bereich ? ' an' : ''}`}
              onClick={() => geheZu({ seite: 'ueben', bereich: b.id })}
              title={b.titel}
            >
              {b.id} {b.titel}
            </button>
          ))}
        </nav>
        {kann && (
          <p className="filterzeile">
            Gefiltert auf das Lernziel: <strong>Ich kann {kann.text}</strong>{' '}
            <button className="textknopf" onClick={() => geheZu({ seite: 'ueben', bereich })}>
              Filter aufheben
            </button>
          </p>
        )}
      </header>

      {lektionen.length > 0 && (
        <section className="karte">
          <h3>Kurz erklärt</h3>
          <ul className="eintraege">
            {lektionen.map((l) => (
              <li key={l.id}>
                <span className="eintrag-text">
                  <strong>{l.titel}</strong>
                  <span className="leise-text">
                    ca. {l.minuten} min{stand.gelesen[l.id] ? ' · gelesen' : ''}
                    {stand.heftAbgleich[l.id] ? ' · mit Heft abgeglichen' : ''}
                  </span>
                </span>
                <button className="knopf leise klein" onClick={() => geheZu({ seite: 'lektion', id: l.id, zurueck: ansicht })}>
                  Lesen
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bereich === '2.4' && !kann && (
        <section className="karte">
          <h3>Endlos-Training Logik</h3>
          <p>Immer neue Ausdrücke – die Lösungen werden berechnet. Stufe 2 stellt gezielt die Falle „von links nach rechts rechnen“.</p>
          <div className="knopfreihe">
            {([1, 2, 3] as const).map((stufe) => (
              <button key={stufe} className="knopf" onClick={() => geheZu({ seite: 'logik', modus: 'auswertung', stufe, zurueck: ansicht })}>
                Auswerten · Stufe {stufe}
              </button>
            ))}
            {([2, 3] as const).map((stufe) => (
              <button key={stufe} className="knopf" onClick={() => geheZu({ seite: 'logik', modus: 'tabelle', stufe, zurueck: ansicht })}>
                Wahrheitstabelle · Stufe {stufe}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="karte">
        <h3>Aufgaben</h3>
        {aufgaben.length === 0 ? (
          <p className="leise-text">Die Aufgaben zu diesem Bereich werden gerade gebaut und erscheinen hier automatisch.</p>
        ) : (
          <ul className="eintraege">
            {aufgaben.map((a) => {
              const v = letzterVersuch(stand, a.id);
              return (
                <li key={a.id}>
                  <span className="eintrag-text">
                    <strong>{a.titel}</strong>
                    <span className="leise-text">
                      {TYP_NAMEN[a.typ]} · ca. {a.minuten} min{a.klausurnah ? ' · Klausurformat' : ''}
                    </span>
                  </span>
                  {v && <span className={`marke ${istRichtig(v) ? 'grad-2' : 'grad-1'}`}>{punkteText(v.punkte, v.max)}</span>}
                  <button className="knopf leise klein" onClick={() => geheZu({ seite: 'aufgabe', id: a.id, zurueck: ansicht })}>
                    {v ? 'Nochmal' : 'Starten'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
