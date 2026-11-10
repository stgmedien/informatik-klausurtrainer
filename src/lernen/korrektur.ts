// Bereitet Freitext-Aufgaben für den KI-Korrektor auf und rechnet dessen Urteile in Punkte um.
import type { KorrekturAnfrage, KorrekturErgebnis, Urteil } from '../../server/ki/typen';
import { attributText, methodeText } from '../engine/klassen';
import { struktogrammAlsText, struktogrammeMitHilfsmethoden } from '../engine/strukto';
import { uebersetze } from './ausfuehren';
import { LEKTIONEN, operator } from '../inhalte';
import type { Merksatz } from '../inhalte';
import type { Aufgabe, Erwartungshorizont, Material } from '../inhalte/typen';
import type { Lernstand } from './stand';

export function materialAlsText(material: Material[] | undefined): string | undefined {
  if (!material?.length) return undefined;
  return material
    .map((m) => {
      switch (m.art) {
        case 'code':
          return `Quelltext${m.titel ? ` (${m.titel})` : ''}:\n${m.quelltext}`;
        case 'text':
          return m.markdown;
        case 'struktogramm': {
          const p = uebersetze(m.quelltext).programm;
          return p ? struktogrammeMitHilfsmethoden(p, m.methode).map(struktogrammAlsText).join('\n') : '';
        }
        case 'welt':
          return `Welt${m.titel ? ` (${m.titel})` : ''} als Karte (# Hindernis, . leer, K Klatsche, F Fliege, > v < ^ Tarantel mit Blickrichtung):\n${m.welt.karte.trim()}`;
        case 'objekte':
          return m.objekte.map((o) => `Objekt ${o.name} : ${o.klasse} – ${o.attribute.map(([n, w]) => `${n} = ${w}`).join(', ')}`).join('\n');
        case 'klassendiagramm':
          return `Klassendiagramm:\n${m.modell.klassen
            .map(
              (k) =>
                `Klasse ${k.name}${k.ober ? ` (Unterklasse von ${k.ober})` : ''}\n  Attribute: ${k.attribute.map(attributText).join('; ') || '–'}\n  Methoden: ${k.methoden.map(methodeText).join('; ') || '–'}`,
            )
            .join('\n')}`;
      }
    })
    .join('\n\n');
}

function operatorAngabe(name: string | undefined): KorrekturAnfrage['operator'] {
  const op = operator(name);
  return op ? { name: op.name, definition: op.definition, erwartet: op.erwartet } : undefined;
}

/** Eigene Formulierungen aus dem Heft zu den Lektionen, die zu den Lernzielen der Aufgabe gehören. */
function eigenerWortlaut(aufgabe: Aufgabe, stand: Lernstand): { titel: string; text: string }[] {
  return LEKTIONEN.filter((l) => l.kann.some((k) => aufgabe.kann.includes(k)))
    .flatMap((l) => l.abschnitte.filter((a): a is Merksatz => a.art === 'merksatz'))
    .filter((m) => stand.merksaetze[m.id])
    .map((m) => ({ titel: m.titel, text: stand.merksaetze[m.id] }));
}

export function baueKorrekturAnfrage(aufgabe: Aufgabe, erwartung: Erwartungshorizont, antwort: string, stand: Lernstand): KorrekturAnfrage {
  return {
    stellung: aufgabe.stellung,
    operator: operatorAngabe(aufgabe.operator),
    material: materialAlsText(aufgabe.material),
    kriterien: erwartung.kriterien,
    musterantwort: erwartung.musterantwort,
    fachbegriffe: erwartung.fachbegriffe,
    wortlaut: eigenerWortlaut(aufgabe, stand),
    antwort,
  };
}

export function tutorGrunddaten(aufgabe: Aufgabe): { stellung: string; operator: KorrekturAnfrage['operator']; material: string | undefined } {
  return { stellung: aufgabe.stellung, operator: operatorAngabe(aufgabe.operator), material: materialAlsText(aufgabe.material) };
}

const ANTEIL: Record<Urteil, number> = { erfuellt: 1, teilweise: 0.5, nicht: 0 };

/** Punkte aus den Urteilen: erfüllt = volle Punkte, teilweise = halbe. Die Summe bildet die App, nicht die KI. */
export function punkteAusUrteilen(erwartung: Erwartungshorizont, urteile: KorrekturErgebnis['kriterien']): number {
  const nachId = new Map(urteile.map((u) => [u.id, u.urteil]));
  return erwartung.kriterien.reduce((summe, k) => summe + k.punkte * ANTEIL[nachId.get(k.id) ?? 'nicht'], 0);
}
