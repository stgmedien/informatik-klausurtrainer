import { useEffect, useMemo, useState } from 'react';
import { aufgabe } from '../../inhalte';
import { PROBEKLAUSUREN, type Probeklausur } from '../../inhalte/klausuren';
import type { Aufgabe } from '../../inhalte/typen';
import { noteText } from '../../lernen/note';
import type { GeheZu } from '../ansicht';
import { AufgabeAnsicht } from '../aufgaben/AufgabeAnsicht';
import type { Abgabe } from '../aufgaben/einfach';
import { datumLang, punkteText } from '../hilfen';
import { useStand } from '../kontext';

function aufgabenDer(k: Probeklausur): { teil: string; nummer: string; aufgabe: Aufgabe }[] {
  return k.teile.flatMap((t, ti) =>
    t.aufgaben.map((id, ai) => {
      const a = aufgabe(id);
      if (!a) throw new Error(`Probeklausur ${k.id}: Aufgabe ${id} fehlt`);
      return { teil: t.titel, nummer: `${ti + 1}${String.fromCharCode(97 + ai)})`, aufgabe: a };
    }),
  );
}

export function maxPunkte(k: Probeklausur): number {
  return aufgabenDer(k).reduce((s, x) => s + x.aufgabe.punkte, 0);
}

export function KlausurUebersicht({ geheZu }: { geheZu: GeheZu }) {
  const { stand } = useStand();
  return (
    <div className="seite">
      <header className="seitenkopf">
        <h1>Probeklausur</h1>
        <p>
          Unter Klausurbedingungen: Zeitlimit, keine Hinweise, kein Ausführen von Programmen. Die Auswertung siehst du erst, wenn du die Klausur
          beendest. Du kannst die Aufgaben auch ausdrucken und auf Papier bearbeiten.
        </p>
      </header>
      {PROBEKLAUSUREN.map((k) => {
        const verlauf = stand.klausuren?.[k.id] ?? [];
        return (
          <section key={k.id} className="karte">
            <h3>{k.titel}</h3>
            <p>{k.beschreibung}</p>
            <p className="leise-text">
              {k.minuten} Minuten · {maxPunkte(k)} Punkte · {aufgabenDer(k).length} Aufgaben
            </p>
            {verlauf.length > 0 && (
              <ul className="klausur-verlauf">
                {verlauf.map((v) => (
                  <li key={v.start}>
                    {datumLang(v.start.slice(0, 10))}: {v.punkte !== undefined ? `${punkteText(v.punkte, v.max ?? 0)} · ${noteText(v.punkte, v.max ?? 1)}` : 'nicht beendet'}
                  </li>
                ))}
              </ul>
            )}
            <div className="knopfreihe">
              <button className="knopf primaer" onClick={() => geheZu({ seite: 'klausur', id: k.id })}>
                Klausur starten
              </button>
              <button className="knopf leise" onClick={() => geheZu({ seite: 'druck', id: k.id })}>
                Druckansicht
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Uhr({ ende }: { ende: number }) {
  const [jetzt, setJetzt] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setJetzt(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const rest = Math.max(0, Math.round((ende - jetzt) / 1000));
  const mm = String(Math.floor(rest / 60)).padStart(2, '0');
  const ss = String(rest % 60).padStart(2, '0');
  return (
    <span className={`uhr${rest === 0 ? ' um' : rest < 300 ? ' knapp' : ''}`} role="timer" aria-live={rest < 60 ? 'polite' : 'off'}>
      {rest === 0 ? 'Zeit ist um' : `${mm}:${ss}`}
    </span>
  );
}

/** Läuft eine Probeklausur durch: Zeitlimit, verdeckte Auswertung, am Ende Punkte und Notenschätzung. */
export function KlausurSpieler({ id, onEnde }: { id: string; onEnde: () => void }) {
  const { aendere } = useStand();
  const klausur = PROBEKLAUSUREN.find((k) => k.id === id);
  const liste = useMemo(() => (klausur ? aufgabenDer(klausur) : []), [klausur]);
  const [start, setStart] = useState<number | null>(null);
  const [beendet, setBeendet] = useState(false);
  const [eingereicht, setEingereicht] = useState<ReadonlySet<string>>(new Set());
  const [ergebnisse, setErgebnisse] = useState<Readonly<Record<string, Abgabe>>>({});
  const [sicher, setSicher] = useState(false);
  const max = liste.reduce((s, x) => s + x.aufgabe.punkte, 0);
  const punkte = Object.values(ergebnisse).reduce((s, a) => s + a.punkte, 0);
  const offen = liste.filter((x) => !ergebnisse[x.aufgabe.id]);

  // Das Ergebnis wird gespeichert, sobald alle Aufgaben bewertet sind (Selbsteinschätzungen kommen nach dem Beenden).
  useEffect(() => {
    if (!klausur || !beendet || offen.length > 0 || start === null) return;
    const startText = new Date(start).toISOString();
    aendere((s) => ({
      ...s,
      klausuren: {
        ...s.klausuren,
        [klausur.id]: (s.klausuren?.[klausur.id] ?? []).map((v) => (v.start === startText ? { ...v, ende: new Date().toISOString(), punkte, max } : v)),
      },
    }));
  }, [beendet, offen.length, punkte, max, start, klausur, aendere]);

  if (!klausur) return null;

  const starten = () => {
    const jetzt = Date.now();
    setStart(jetzt);
    aendere((s) => ({ ...s, klausuren: { ...s.klausuren, [klausur.id]: [...(s.klausuren?.[klausur.id] ?? []), { start: new Date(jetzt).toISOString() }] } }));
  };

  const beenden = () => {
    setBeendet(true);
    setSicher(false);
    window.scrollTo({ top: 0 });
  };

  if (start === null) {
    return (
      <div className="seite">
        <div className="spieler-kopf">
          <button className="textknopf" onClick={onEnde}>
            ← Zurück
          </button>
        </div>
        <article className="aufgabe">
          <h2>{klausur.titel}</h2>
          <ul>
            <li>Bearbeitungszeit: {klausur.minuten} Minuten (eine Uhr läuft mit; danach kannst du zu Ende schreiben, das wird aber vermerkt).</li>
            <li>Keine Hinweise, kein Tutor, kein Ausführen. Programmieraufgaben im Papier-Modus.</li>
            <li>Ergebnisse und Lösungen siehst du erst, wenn du die Klausur beendest.</li>
            <li>Freitexte werden nach dem Erwartungshorizont bewertet – mit KI, falls eingerichtet, sonst schätzt du dich am Ende selbst ein.</li>
            <li>
              {liste.length} Aufgaben, {max} Punkte.
            </li>
          </ul>
          <button className="knopf primaer gross" onClick={starten}>
            Jetzt starten
          </button>
        </article>
      </div>
    );
  }

  return (
    <div className="seite">
      <div className="klausur-leiste">
        <strong>{klausur.titel}</strong>
        {!beendet && <Uhr ende={start + klausur.minuten * 60_000} />}
        <span className="leise-text">
          {eingereicht.size} von {liste.length} abgegeben
        </span>
        {!beendet &&
          (sicher ? (
            <span className="knopfreihe">
              <button className="knopf klein primaer" onClick={beenden}>
                Ja, beenden
              </button>
              <button className="knopf klein leise" onClick={() => setSicher(false)}>
                Weiter schreiben
              </button>
            </span>
          ) : (
            <button className="knopf klein" onClick={() => setSicher(true)}>
              Klausur beenden
            </button>
          ))}
      </div>

      {beendet && (
        <section className="karte hauptkarte">
          <h2>Auswertung</h2>
          <p className="abschluss-punkte">
            {punkteText(punkte, max)} · {Math.round((punkte / max) * 100)} %
          </p>
          {offen.length === 0 ? (
            <p>
              Geschätzte Note: <strong>{noteText(punkte, max)}</strong>
              <span className="leise-text"> – nach der in der Oberstufe üblichen Tabelle; deine Lehrkraft kann anders gewichten.</span>
            </p>
          ) : (
            <p>
              Noch {offen.length === 1 ? 'eine Aufgabe' : `${offen.length} Aufgaben`} ohne Bewertung (nicht bearbeitet oder Selbsteinschätzung offen). Nicht
              bearbeitete Aufgaben zählen 0 Punkte – die Note erscheint, sobald alles eingeschätzt ist.
            </p>
          )}
          <table className="md-tabelle auswertung-tabelle">
            <thead>
              <tr>
                <th>Aufgabe</th>
                <th>Punkte</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((x) => (
                <tr key={x.aufgabe.id}>
                  <td>
                    <a href={`#a-${x.aufgabe.id}`}>
                      {x.nummer} {x.aufgabe.titel}
                    </a>
                  </td>
                  <td>
                    {ergebnisse[x.aufgabe.id]
                      ? punkteText(ergebnisse[x.aufgabe.id].punkte, x.aufgabe.punkte)
                      : eingereicht.has(x.aufgabe.id)
                        ? 'noch einschätzen'
                        : `0 von ${x.aufgabe.punkte} (nicht bearbeitet)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {offen.length > 0 && (
            <button className="textknopf" onClick={() => offen.forEach((x) => setErgebnisse((alt) => ({ ...alt, [x.aufgabe.id]: { punkte: 0, max: x.aufgabe.punkte, quelle: 'automatisch' } })))}>
              Nicht bearbeitete Aufgaben mit 0 Punkten werten
            </button>
          )}
          <div className="knopfreihe">
            <button className="knopf" onClick={onEnde}>
              Zur Übersicht
            </button>
          </div>
        </section>
      )}

      {klausur.teile.map((t) => (
        <section key={t.titel} className="klausur-teil">
          <h3 className="teil-titel">{t.titel}</h3>
          {liste
            .filter((x) => x.teil === t.titel)
            .map((x) => (
              <div key={x.aufgabe.id} id={`a-${x.aufgabe.id}`}>
                <AufgabeAnsicht
                  aufgabe={x.aufgabe}
                  klausur={{
                    nummer: x.nummer,
                    verdeckt: !beendet,
                    onEingereicht: () => setEingereicht((alt) => new Set(alt).add(x.aufgabe.id)),
                    onErgebnis: (a) => setErgebnisse((alt) => ({ ...alt, [x.aufgabe.id]: a })),
                  }}
                />
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
