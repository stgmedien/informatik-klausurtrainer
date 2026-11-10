import { useState } from 'react';
import { EINHEITEN, aufgabe, lektion } from '../inhalte';
import { LektionAnsicht } from './LektionAnsicht';
import { LogikTraining } from './LogikTraining';
import type { Ansicht } from './ansicht';
import { AufgabeAnsicht } from './aufgaben/AufgabeAnsicht';
import { useStand } from './kontext';
import { EinheitSpieler, Heute, Wiederholung } from './seiten/Heute';
import { Kannliste, Ueben } from './seiten/Lernen';
import { Einstellungen, Spickzettel } from './seiten/Rest';
import { Werkstatt } from './seiten/Werkstatt';
import { Fehlerheft } from './seiten/Fehlerheft';

const NAVIGATION: { ansicht: Ansicht; titel: string }[] = [
  { ansicht: { seite: 'heute' }, titel: 'Heute' },
  { ansicht: { seite: 'kann' }, titel: 'Kann-Liste' },
  { ansicht: { seite: 'ueben' }, titel: 'Üben' },
  { ansicht: { seite: 'werkstatt' }, titel: 'Werkstatt' },
  { ansicht: { seite: 'fehlerheft' }, titel: 'Fehlerheft' },
  { ansicht: { seite: 'spick' }, titel: 'Spickzettel' },
  { ansicht: { seite: 'einstellungen' }, titel: 'Einstellungen' },
];

/** Unterseiten zählen in der Navigation zu ihrer Herkunft. */
function hauptseite(a: Ansicht): Ansicht['seite'] {
  if (a.seite === 'einheit' || a.seite === 'wiederholung') return 'heute';
  if (a.seite === 'aufgabe' || a.seite === 'lektion' || a.seite === 'logik') return hauptseite(a.zurueck);
  return a.seite;
}

export function App() {
  const { speicherFehler } = useStand();
  const [ansicht, setAnsicht] = useState<Ansicht>({ seite: 'heute' });

  const geheZu = (ziel: Ansicht) => {
    setAnsicht(ziel);
    window.scrollTo({ top: 0 });
  };
  const aktiv = hauptseite(ansicht);

  let inhalt;
  switch (ansicht.seite) {
    case 'heute':
      inhalt = <Heute geheZu={geheZu} />;
      break;
    case 'einheit': {
      const einheit = EINHEITEN.find((e) => e.id === ansicht.id);
      inhalt = einheit ? <EinheitSpieler key={einheit.id} einheit={einheit} onEnde={() => geheZu({ seite: 'heute' })} /> : null;
      break;
    }
    case 'wiederholung':
      inhalt = <Wiederholung onEnde={() => geheZu({ seite: 'heute' })} />;
      break;
    case 'kann':
      inhalt = <Kannliste geheZu={geheZu} />;
      break;
    case 'ueben':
      inhalt = <Ueben ansicht={ansicht} geheZu={geheZu} />;
      break;
    case 'aufgabe': {
      const a = aufgabe(ansicht.id);
      const zurueck = () => geheZu(ansicht.zurueck);
      inhalt = a ? (
        <div className="seite spieler">
          <div className="spieler-kopf">
            <button className="textknopf" onClick={zurueck}>
              ← Zurück
            </button>
          </div>
          <AufgabeAnsicht key={a.id} aufgabe={a} onWeiter={zurueck} weiterText="Zurück zur Liste" />
        </div>
      ) : null;
      break;
    }
    case 'lektion': {
      const l = lektion(ansicht.id);
      const zurueck = () => geheZu(ansicht.zurueck);
      inhalt = l ? (
        <div className="seite spieler">
          <div className="spieler-kopf">
            <button className="textknopf" onClick={zurueck}>
              ← Zurück
            </button>
          </div>
          <LektionAnsicht key={l.id} lektion={l} onWeiter={zurueck} weiterText="Zurück zur Liste" />
        </div>
      ) : null;
      break;
    }
    case 'logik': {
      const zurueck = () => geheZu(ansicht.zurueck);
      inhalt = (
        <div className="seite spieler">
          <div className="spieler-kopf">
            <button className="textknopf" onClick={zurueck}>
              ← Zurück
            </button>
            <span className="spieler-titel">Endlos-Training Logik · Stufe {ansicht.stufe}</span>
          </div>
          <LogikTraining key={`${ansicht.modus}-${ansicht.stufe}`} modus={ansicht.modus} stufe={ansicht.stufe} />
        </div>
      );
      break;
    }
    case 'werkstatt':
      inhalt = <Werkstatt />;
      break;
    case 'fehlerheft':
      inhalt = <Fehlerheft geheZu={geheZu} />;
      break;
    case 'spick':
      inhalt = <Spickzettel />;
      break;
    case 'einstellungen':
      inhalt = <Einstellungen />;
      break;
  }

  return (
    <>
      <header className="kopfleiste">
        <div className="kopf-innen">
          <button className="logo" onClick={() => geheZu({ seite: 'heute' })} aria-label="Spinnen-Trainer, zur Startseite">
            <img src="/bilder/thekla.png" alt="" width={28} height={28} />
            <span>Spinnen-Trainer</span>
          </button>
          <nav className="hauptnav" aria-label="Hauptnavigation">
            {NAVIGATION.map((n) => (
              <button key={n.titel} className={aktiv === n.ansicht.seite ? 'aktiv' : ''} aria-current={aktiv === n.ansicht.seite ? 'page' : undefined} onClick={() => geheZu(n.ansicht)}>
                {n.titel}
              </button>
            ))}
          </nav>
        </div>
      </header>
      {speicherFehler && (
        <p className="speicherfehler" role="alert">
          {speicherFehler}
        </p>
      )}
      <main>{inhalt}</main>
    </>
  );
}
