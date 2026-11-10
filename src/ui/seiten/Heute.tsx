import { useMemo, useState } from 'react';
import { EINHEITEN, KANNLISTE, aufgabe, kannItem, lektion } from '../../inhalte';
import type { Einheit } from '../../inhalte/typen';
import { faelligeFehler } from '../../lernen/fehlerheft';
import { aufgabenIdsDerEinheit, aufwaermAufgaben, einheitMinuten, faelligeKann, istVerfuegbar, naechsteEinheit, zaehleGrade } from '../../lernen/planer';
import { GRAD_NAMEN, type Grad, heute, istRichtig, kannStand, tageBis } from '../../lernen/stand';
import { LektionAnsicht } from '../LektionAnsicht';
import { LogikTraining } from '../LogikTraining';
import type { GeheZu } from '../ansicht';
import { AufgabeAnsicht } from '../aufgaben/AufgabeAnsicht';
import { KlausurSpieler } from './Probeklausur';
import { datumLang, punkteText } from '../hilfen';
import { useStand } from '../kontext';

export function GradBalken() {
  const { stand } = useStand();
  const grade = zaehleGrade(stand);
  const gesamt = KANNLISTE.length;
  return (
    <div className="gradbalken-block">
      <div className="gradbalken" role="img" aria-label={`Kann-Liste: ${grade[3]} klausurfest, ${grade[2]} sicher, ${grade[1]} geübt, ${grade[0]} offen`}>
        {([3, 2, 1, 0] as Grad[]).map((g) => grade[g] > 0 && <span key={g} className={`grad-${g}`} style={{ flexGrow: grade[g] }} />)}
      </div>
      <div className="gradlegende">
        {([3, 2, 1, 0] as Grad[]).map((g) => (
          <span key={g}>
            <i className={`punkt grad-${g}`} /> {grade[g]} {GRAD_NAMEN[g]}
          </span>
        ))}
        <span className="leise-text">von {gesamt} Lernzielen</span>
      </div>
    </div>
  );
}

export function Heute({ geheZu }: { geheZu: GeheZu }) {
  const { stand, aendere } = useStand();
  const tag = heute();
  const naechste = naechsteEinheit(stand);
  const heuteGeschafft = EINHEITEN.some((e) => stand.einheiten[e.id]?.fertigAm === tag);
  const faellig = faelligeKann(stand, tag);
  const fehlerFaellig = faelligeFehler(stand, tag).length;
  const resttage = stand.klausurDatum ? tageBis(tag, stand.klausurDatum) : null;
  const offen = EINHEITEN.filter((e) => istVerfuegbar(e) && !stand.einheiten[e.id]?.fertigAm).length;
  const begonnen = naechste ? (stand.einheiten[naechste.id]?.schritt ?? 0) > 0 : false;

  const countdown =
    resttage === null
      ? null
      : resttage > 1
        ? `Noch ${resttage} Tage bis zur Klausur`
        : resttage === 1
          ? 'Morgen ist die Klausur'
          : resttage === 0
            ? 'Heute ist die Klausur – viel Erfolg!'
            : 'Die Klausur ist geschrieben';

  return (
    <div className="seite">
      <header className="seitenkopf">
        <p className="datum">{datumLang(tag)}</p>
        <h1>{countdown ?? 'Dein Klausurtraining'}</h1>
        {resttage === null && (
          <label className="datum-eingabe">
            Wann ist die Klausur?{' '}
            <input type="date" min={tag} onChange={(e) => e.target.value && aendere((s) => ({ ...s, klausurDatum: e.target.value }))} />
          </label>
        )}
        {resttage !== null && resttage > 0 && offen > resttage && (
          <p className="hinweiszeile">
            Es sind noch {offen} Einheiten offen, aber nur {resttage} {resttage === 1 ? 'Tag' : 'Tage'} Zeit – an manchen Tagen lohnen sich zwei Einheiten.
          </p>
        )}
      </header>

      {naechste ? (
        <section className={`karte hauptkarte${heuteGeschafft ? ' ruhig' : ''}`}>
          <p className="karten-ueber">
            {heuteGeschafft ? 'Für heute geschafft. Wenn du magst, geht es weiter mit' : `Einheit ${naechste.tag} von ${EINHEITEN.length}`}
          </p>
          <h2>{naechste.titel}</h2>
          <p>{naechste.ziel}</p>
          <p className="leise-text">
            ca. {einheitMinuten(naechste)} Minuten · {naechste.schritte.length} Schritte
            {begonnen && ` · ${stand.einheiten[naechste.id]?.schritt} davon erledigt`}
          </p>
          <button className={`knopf ${heuteGeschafft ? 'leise' : 'primaer gross'}`} onClick={() => geheZu({ seite: 'einheit', id: naechste.id })}>
            {begonnen ? 'Einheit fortsetzen' : heuteGeschafft ? `Einheit ${naechste.tag} schon heute beginnen` : 'Heutige Einheit starten'}
          </button>
        </section>
      ) : (
        <section className="karte hauptkarte ruhig">
          <h2>Alle verfügbaren Einheiten sind geschafft</h2>
          <p>Übe jetzt gezielt nach der Kann-Liste, bis alle Lernziele klausurfest sind.</p>
          <button className="knopf primaer" onClick={() => geheZu({ seite: 'kann' })}>
            Zur Kann-Liste
          </button>
        </section>
      )}

      {fehlerFaellig > 0 && (
        <section className="karte">
          <h3>Fehlerheft</h3>
          <p>
            {fehlerFaellig === 1 ? 'Eine Aufgabe, die gestern nicht geklappt hat, ist' : `${fehlerFaellig} Aufgaben, die zuletzt nicht geklappt haben, sind`} heute
            wieder dran.
          </p>
          <button className="knopf" onClick={() => geheZu({ seite: 'fehlerheft' })}>
            Fehlerheft öffnen
          </button>
        </section>
      )}

      {faellig.length > 0 && (
        <section className="karte">
          <h3>Wiederholung fällig</h3>
          <p>
            {faellig.length === 1 ? 'Ein Lernziel sollte' : `${faellig.length} Lernziele sollten`} heute kurz aufgefrischt werden:{' '}
            {faellig
              .slice(0, 4)
              .map((id) => kannItem(id)?.kurz)
              .join(' · ')}
            {faellig.length > 4 && ' …'}
          </p>
          <button className="knopf" onClick={() => geheZu({ seite: 'wiederholung' })}>
            Kurz wiederholen (ca. 5 min)
          </button>
        </section>
      )}

      <section className="karte">
        <h3>Stand auf der Kann-Liste</h3>
        <GradBalken />
        <button className="textknopf" onClick={() => geheZu({ seite: 'kann' })}>
          Kann-Liste öffnen
        </button>
      </section>

      <section className="karte">
        <h3>Alle Einheiten</h3>
        <ol className="einheiten-liste">
          {EINHEITEN.map((e) => {
            const fortschritt = stand.einheiten[e.id];
            const status = fortschritt?.fertigAm ? 'fertig' : !istVerfuegbar(e) ? 'gesperrt' : e.id === naechste?.id ? 'aktuell' : 'offen';
            return (
              <li key={e.id} className={`einheit-zeile ${status}`}>
                <span className="einheit-nr">{e.tag}</span>
                <span className="einheit-text">
                  <strong>{e.titel}</strong>
                  <span className="leise-text">
                    {status === 'fertig' && `geschafft am ${datumLang(fortschritt!.fertigAm!)}`}
                    {status === 'gesperrt' && e.inVorbereitung}
                    {(status === 'offen' || status === 'aktuell') && `ca. ${einheitMinuten(e)} min`}
                  </span>
                </span>
                {istVerfuegbar(e) && (
                  <button className="knopf leise klein" onClick={() => geheZu({ seite: 'einheit', id: e.id })}>
                    {status === 'fertig' ? 'Nochmal' : 'Öffnen'}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Fortschritt({ schritt, gesamt, text }: { schritt: number; gesamt: number; text: string }) {
  return (
    <div className="fortschritt">
      <div className="fortschritt-leiste" role="progressbar" aria-valuemin={0} aria-valuemax={gesamt} aria-valuenow={schritt}>
        <span style={{ width: `${gesamt === 0 ? 0 : (schritt / gesamt) * 100}%` }} />
      </div>
      <span className="fortschritt-text">{text}</span>
    </div>
  );
}

/** Zusammenfassung am Ende einer Einheit oder Wiederholung. */
function Abschluss({ titel, aufgabenIds, seit, onFertig }: { titel: string; aufgabenIds: string[]; seit: string; onFertig: () => void }) {
  const { stand } = useStand();
  const versuche = stand.versuche.filter((v) => v.zeit >= seit && aufgabenIds.includes(v.aufgabe));
  // Pro Aufgabe zählt der letzte Versuch.
  const letzte = new Map(versuche.map((v) => [v.aufgabe, v]));
  const punkte = [...letzte.values()].reduce((s, v) => s + v.punkte, 0);
  const max = [...letzte.values()].reduce((s, v) => s + v.max, 0);
  const wackelig = [...letzte.values()].filter((v) => !istRichtig(v));
  const ziele = [...new Set([...letzte.values()].flatMap((v) => v.kann))];

  return (
    <article className="aufgabe abschluss">
      <h2>{titel}</h2>
      {max > 0 && <p className="abschluss-punkte">{punkteText(punkte, max)}</p>}
      {ziele.length > 0 && (
        <>
          <h4>Stand der Lernziele</h4>
          <ul className="ziel-liste">
            {ziele.map((id) => {
              const grad = kannStand(stand, id).grad;
              return (
                <li key={id}>
                  <span className={`marke grad-${grad}`}>{GRAD_NAMEN[grad]}</span> {kannItem(id)?.kurz}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {wackelig.length > 0 ? (
        <p>
          Noch wackelig: {wackelig.map((v) => aufgabe(v.aufgabe)?.titel ?? 'Logik-Übung').join(' · ')}. Diese Themen kommen morgen als Aufwärmfragen
          zurück.
        </p>
      ) : (
        max > 0 && <p>Alles sicher gelöst. „Klausurfest“ wird ein Lernziel, wenn es an zwei verschiedenen Tagen ohne Hinweis klappt.</p>
      )}
      <footer className="aufgabe-fuss">
        <button className="knopf primaer" onClick={onFertig}>
          Zur Übersicht
        </button>
      </footer>
    </article>
  );
}

export function EinheitSpieler({ einheit, onEnde }: { einheit: Einheit; onEnde: () => void }) {
  const { stand, aendere } = useStand();
  const [seit] = useState(() => new Date().toISOString());
  const gespeichert = stand.einheiten[einheit.id];
  // Eine abgeschlossene Einheit beginnt beim erneuten Öffnen von vorn.
  const [schritt, setSchritt] = useState(() => (gespeichert?.fertigAm ? 0 : Math.min(gespeichert?.schritt ?? 0, einheit.schritte.length)));
  // Aufwärmfragen zu früheren Themen gibt es nur beim frischen Start einer Einheit.
  const aufwaermen = useMemo(
    () => (schritt === 0 ? aufwaermAufgaben(stand, heute(), aufgabenIdsDerEinheit(einheit)) : []),
    // Bewusst nur beim Öffnen berechnet: Die Liste soll sich während der Einheit nicht ändern.
    [einheit.id],
  );
  const [warm, setWarm] = useState(0);
  const [fertig, setFertig] = useState(false);

  const imAufwaermen = warm < aufwaermen.length;
  const gesamt = aufwaermen.length + einheit.schritte.length;
  const position = imAufwaermen ? warm : aufwaermen.length + schritt;

  const weiter = () => {
    if (imAufwaermen) return setWarm(warm + 1);
    const neu = schritt + 1;
    const amEnde = neu >= einheit.schritte.length;
    aendere((s) => ({
      ...s,
      einheiten: { ...s.einheiten, [einheit.id]: { schritt: neu, fertigAm: amEnde ? heute() : s.einheiten[einheit.id]?.fertigAm } },
    }));
    setSchritt(neu);
    if (amEnde) setFertig(true);
    window.scrollTo({ top: 0 });
  };

  const aufgabenIds = [...aufwaermen, ...aufgabenIdsDerEinheit(einheit)];

  let inhalt;
  if (fertig) {
    inhalt = <Abschluss titel={`Einheit ${einheit.tag} geschafft`} aufgabenIds={aufgabenIds} seit={seit} onFertig={onEnde} />;
  } else if (imAufwaermen) {
    const a = aufgabe(aufwaermen[warm]);
    inhalt = a ? <AufgabeAnsicht key={`warm-${a.id}`} aufgabe={a} onWeiter={weiter} /> : null;
  } else {
    const s = einheit.schritte[schritt];
    if (s.art === 'lektion') {
      const l = lektion(s.id);
      inhalt = l ? <LektionAnsicht key={l.id} lektion={l} onWeiter={weiter} /> : null;
    } else if (s.art === 'aufgabe') {
      const a = aufgabe(s.id);
      inhalt = a ? <AufgabeAnsicht key={a.id} aufgabe={a} onWeiter={weiter} weiterText={schritt + 1 >= einheit.schritte.length ? 'Einheit abschließen' : 'Weiter'} /> : null;
    } else if (s.art === 'klausur') {
      inhalt = <KlausurSpieler key={`klausur-${s.id}`} id={s.id} onEnde={weiter} />;
    } else {
      inhalt = <LogikTraining key={`logik-${schritt}`} modus={s.modus} stufe={s.stufe} anzahl={s.anzahl} onFertig={weiter} />;
    }
  }

  return (
    <div className="seite spieler">
      <div className="spieler-kopf">
        <button className="textknopf" onClick={onEnde}>
          ← Übersicht
        </button>
        <span className="spieler-titel">
          Einheit {einheit.tag}: {einheit.titel}
        </span>
      </div>
      {!fertig && (
        <Fortschritt
          schritt={position}
          gesamt={gesamt}
          text={imAufwaermen ? `Aufwärmen ${warm + 1} von ${aufwaermen.length} – Fragen zu früheren Themen` : `Schritt ${schritt + 1} von ${einheit.schritte.length}`}
        />
      )}
      {inhalt}
    </div>
  );
}

/** Kurze Wiederholung fälliger Lernziele außerhalb einer Einheit. */
export function Wiederholung({ onEnde }: { onEnde: () => void }) {
  const { stand } = useStand();
  const [seit] = useState(() => new Date().toISOString());
  const ids = useMemo(
    () => aufwaermAufgaben(stand, heute(), new Set(), 5),
    // Die Auswahl wird einmal beim Öffnen getroffen.
    [],
  );
  const [nr, setNr] = useState(0);
  const a = aufgabe(ids[nr]);

  return (
    <div className="seite spieler">
      <div className="spieler-kopf">
        <button className="textknopf" onClick={onEnde}>
          ← Übersicht
        </button>
        <span className="spieler-titel">Wiederholung</span>
      </div>
      {ids.length === 0 ? (
        <article className="aufgabe">
          <h2>Gerade ist nichts fällig</h2>
          <p>Alle geübten Lernziele wurden heute schon wiederholt oder sind noch nicht wieder dran.</p>
          <button className="knopf primaer" onClick={onEnde}>
            Zur Übersicht
          </button>
        </article>
      ) : a ? (
        <>
          <Fortschritt schritt={nr} gesamt={ids.length} text={`Frage ${nr + 1} von ${ids.length}`} />
          <AufgabeAnsicht key={a.id} aufgabe={a} onWeiter={() => setNr(nr + 1)} weiterText={nr + 1 >= ids.length ? 'Abschließen' : 'Weiter'} />
        </>
      ) : (
        <Abschluss titel="Wiederholung geschafft" aufgabenIds={ids} seit={seit} onFertig={onEnde} />
      )}
    </div>
  );
}
