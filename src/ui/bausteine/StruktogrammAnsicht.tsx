import { useMemo } from 'react';
import type { Programm } from '../../engine/java';
import { type SBlock, type Sprache, type Struktogramm, blockZuKnoten, struktogramm, struktogrammeMitHilfsmethoden } from '../../engine/strukto';
import { useStand } from '../kontext';

interface Props {
  programm: Programm;
  methode: string;
  mitHilfsmethoden?: boolean;
  sprache?: Sprache;
  /** Knoten-ID des gerade ausgeführten Schritts. */
  aktiverKnoten?: number;
}

function Bloecke({ bloecke, aktiv, beschriftung }: { bloecke: SBlock[]; aktiv: SBlock | null; beschriftung: [string, string] }) {
  if (bloecke.length === 0) return <div className="sg-leer">∅</div>;
  return (
    <>
      {bloecke.map((b, i) => (
        <Block key={i} block={b} aktiv={aktiv} beschriftung={beschriftung} />
      ))}
    </>
  );
}

function Block({ block: b, aktiv, beschriftung }: { block: SBlock; aktiv: SBlock | null; beschriftung: [string, string] }) {
  const an = aktiv === b ? ' aktiv' : '';
  switch (b.art) {
    case 'anweisung':
      return <div className={`sg-anw${an}`}>{b.text}</div>;
    case 'aufruf':
      return (
        <div className={`sg-anw sg-aufruf${an}`}>
          <span>{b.text}</span>
        </div>
      );
    case 'kopf':
    case 'zaehl':
      return (
        <div className={`sg-schleife${an}`}>
          <div className="sg-bed">{b.art === 'zaehl' ? b.kopf : b.bedingung}</div>
          <div className="sg-rumpf">
            <Bloecke bloecke={b.rumpf} aktiv={aktiv} beschriftung={beschriftung} />
          </div>
        </div>
      );
    case 'fuss':
      return (
        <div className={`sg-schleife fuss${an}`}>
          <div className="sg-rumpf">
            <Bloecke bloecke={b.rumpf} aktiv={aktiv} beschriftung={beschriftung} />
          </div>
          <div className="sg-bed">{b.bedingung}</div>
        </div>
      );
    case 'verzweigung':
      return (
        <div className={`sg-verz${an}`}>
          <div className="sg-dreieck">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="0" x2="50" y2="100" />
              <line x1="100" y1="0" x2="50" y2="100" />
            </svg>
            <span className="sg-frage">{b.bedingung}</span>
            <span className="sg-wahr">{beschriftung[0]}</span>
            <span className="sg-falsch">{beschriftung[1]}</span>
          </div>
          <div className="sg-zweige">
            <div className="sg-zweig">
              <Bloecke bloecke={b.dann} aktiv={aktiv} beschriftung={beschriftung} />
            </div>
            <div className="sg-zweig">
              <Bloecke bloecke={b.sonst} aktiv={aktiv} beschriftung={beschriftung} />
            </div>
          </div>
        </div>
      );
  }
}

export function EinStruktogramm({ s, aktiverKnoten }: { s: Struktogramm; aktiverKnoten?: number }) {
  const { stand } = useStand();
  const beschriftung: [string, string] = stand.struktoBeschriftung === 'ja-nein' ? ['Ja', 'Nein'] : ['Wahr', 'Falsch'];
  const aktiv = aktiverKnoten === undefined ? null : blockZuKnoten(s.bloecke, aktiverKnoten);
  return (
    <div className="sg" role="figure" aria-label={`Struktogramm ${s.titel}`}>
      <div className="sg-titel">{s.titel}</div>
      <div className="sg-koerper">
        <Bloecke bloecke={s.bloecke} aktiv={aktiv} beschriftung={beschriftung} />
      </div>
    </div>
  );
}

/** Nassi-Shneiderman-Struktogramm in den Farben aus dem Unterricht. */
export function StruktogrammAnsicht({ programm, methode, mitHilfsmethoden, sprache = 'umgangssprache', aktiverKnoten }: Props) {
  const liste = useMemo(
    () => (mitHilfsmethoden ? struktogrammeMitHilfsmethoden(programm, methode, sprache) : [struktogramm(programm, methode, sprache)]),
    [programm, methode, mitHilfsmethoden, sprache],
  );
  return (
    <div className="sg-gruppe">
      {liste.map((s) => (
        <EinStruktogramm key={s.methode} s={s} aktiverKnoten={aktiverKnoten} />
      ))}
    </div>
  );
}
