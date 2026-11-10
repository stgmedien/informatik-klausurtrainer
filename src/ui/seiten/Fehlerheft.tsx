import { TYP_NAMEN, aufgabe, kannItem } from '../../inhalte';
import { fehlermuster } from '../../inhalte/fehlermuster';
import { fehlerheft, musterStatistik } from '../../lernen/fehlerheft';
import { heute } from '../../lernen/stand';
import type { GeheZu } from '../ansicht';
import { datumLang, punkteText } from '../hilfen';
import { useStand } from '../kontext';

export function Fehlerheft({ geheZu }: { geheZu: GeheZu }) {
  const { stand } = useStand();
  const tag = heute();
  const eintraege = fehlerheft(stand);
  const offen = eintraege.filter((e) => e.status === 'offen');
  const gefestigt = eintraege.filter((e) => e.status === 'gefestigt');
  const statistik = musterStatistik(stand).slice(0, 6);

  return (
    <div className="seite">
      <header className="seitenkopf">
        <h1>Fehlerheft</h1>
        <p>
          Hier landet jede Aufgabe, die nicht geklappt hat. Sie kommt am nächsten Tag als Aufwärmfrage wieder. Als gefestigt gilt ein Fehler erst,
          wenn du die Aufgabe an einem späteren Tag ohne Hinweis richtig löst.
        </p>
      </header>

      {statistik.length > 0 && (
        <section className="karte">
          <h3>Deine häufigsten Fehlermuster</h3>
          <ul className="muster-statistik">
            {statistik.map(({ id, anzahl }) => {
              const m = fehlermuster(id);
              if (!m) return null;
              return (
                <li key={id}>
                  <span className="muster-zahl">{anzahl}×</span>
                  <span>
                    <strong>{m.titel}</strong>
                    <span className="leise-text"> – auf Papier: {m.gegenmittel}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="karte">
        <h3>Offen ({offen.length})</h3>
        {offen.length === 0 ? (
          <p className="leise-text">Nichts offen. {eintraege.length === 0 ? 'Bisher ist noch nichts schiefgegangen.' : ''}</p>
        ) : (
          <ul className="eintraege">
            {offen.map((e) => {
              const a = aufgabe(e.aufgabe)!;
              const faellig = e.faelligAm !== null && e.faelligAm <= tag && e.letzter.tag < tag;
              return (
                <li key={e.aufgabe}>
                  <span className="eintrag-text">
                    <strong>{a.titel}</strong>
                    <span className="leise-text">
                      {TYP_NAMEN[a.typ]} · {a.kann.map((k) => kannItem(k)?.kurz).join(', ')} · zuletzt {punkteText(e.letzter.punkte, e.letzter.max)}
                      {e.fehlversuche > 1 ? ` · ${e.fehlversuche} Fehlversuche` : ''}
                    </span>
                    {e.muster.length > 0 && (
                      <span className="eintrag-muster">
                        {e.muster.map((id) => (
                          <span key={id} className="marke grad-1">
                            {fehlermuster(id)?.titel ?? id}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className={`marke ${faellig ? 'klausur' : ''}`}>{faellig ? 'heute dran' : e.faelligAm ? `ab ${datumLang(e.faelligAm)}` : ''}</span>
                  <button className="knopf leise klein" onClick={() => geheZu({ seite: 'aufgabe', id: a.id, zurueck: { seite: 'fehlerheft' } })}>
                    Nochmal
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {gefestigt.length > 0 && (
        <section className="karte">
          <h3>Gefestigt ({gefestigt.length})</h3>
          <ul className="eintraege">
            {gefestigt.map((e) => (
              <li key={e.aufgabe}>
                <span className="eintrag-text">
                  <strong>{aufgabe(e.aufgabe)?.titel}</strong>
                  <span className="leise-text">nach {e.fehlversuche} Fehlversuch{e.fehlversuche > 1 ? 'en' : ''} sicher gelöst</span>
                </span>
                <span className="marke grad-3">gefestigt</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
