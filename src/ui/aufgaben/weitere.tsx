// Klassendiagramm lesen.
import { useMemo, useState } from 'react';
import { bewerteKlassenLesen, eintraegeKlassenLesen } from '../../lernen/bewertung';
import { KlassenDiagramm } from '../bausteine/KlassenDiagramm';
import { hash, mische } from '../hilfen';
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
