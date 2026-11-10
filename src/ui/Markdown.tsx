import { Fragment, type ReactNode } from 'react';

// Kleiner Markdown-Darsteller für die Inhalte der App: Absätze, **fett**, *kursiv*, `Code`,
// Listen, Tabellen und Codeblöcke. Bewusst ohne Abhängigkeit und ohne HTML-Durchreichung.

export function inline(text: string): ReactNode[] {
  const teile = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return teile.map((teil, i) => {
    if (teil.startsWith('`') && teil.endsWith('`') && teil.length > 2) return <code key={i}>{teil.slice(1, -1)}</code>;
    if (teil.startsWith('**') && teil.endsWith('**') && teil.length > 4) return <strong key={i}>{inline(teil.slice(2, -2))}</strong>;
    if (teil.startsWith('*') && teil.endsWith('*') && teil.length > 2) return <em key={i}>{inline(teil.slice(1, -1))}</em>;
    return <Fragment key={i}>{teil}</Fragment>;
  });
}

function zelle(text: string): ReactNode {
  const zeilen = text.split(/<br\s*\/?>/);
  return zeilen.map((zeile, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {inline(zeile)}
    </Fragment>
  ));
}

function tabellenZellen(zeile: string): string[] {
  return zeile
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((z) => z.trim().replace(/\\\|/g, '|'));
}

export function Markdown({ text, klasse }: { text: string; klasse?: string }) {
  const zeilen = text.split('\n');
  const bloecke: ReactNode[] = [];
  let i = 0;
  const schluessel = () => bloecke.length;

  while (i < zeilen.length) {
    const zeile = zeilen[i];
    if (zeile.trim() === '') {
      i++;
      continue;
    }
    if (zeile.trimStart().startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < zeilen.length && !zeilen[i].trimStart().startsWith('```')) code.push(zeilen[i++]);
      i++;
      bloecke.push(
        <pre key={schluessel()} className="codeblock">
          {code.join('\n')}
        </pre>,
      );
      continue;
    }
    if (zeile.trimStart().startsWith('|')) {
      const reihen: string[] = [];
      while (i < zeilen.length && zeilen[i].trimStart().startsWith('|')) reihen.push(zeilen[i++]);
      const [kopf, , ...rest] = reihen;
      bloecke.push(
        <div key={schluessel()} className="tabelle-rahmen">
          <table className="md-tabelle">
            <thead>
              <tr>
                {tabellenZellen(kopf).map((z, n) => (
                  <th key={n}>{zelle(z)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((reihe, r) => (
                <tr key={r}>
                  {tabellenZellen(reihe).map((z, n) => (
                    <td key={n}>{zelle(z)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const liste = /^(\s*)([-*]|\d+\.)\s+/.exec(zeile);
    if (liste) {
      const geordnet = /\d/.test(liste[2]);
      const punkte: string[] = [];
      while (i < zeilen.length && /^\s*([-*]|\d+\.)\s+/.test(zeilen[i])) {
        punkte.push(zeilen[i].replace(/^\s*([-*]|\d+\.)\s+/, ''));
        i++;
      }
      const eintraege = punkte.map((p, n) => <li key={n}>{inline(p)}</li>);
      bloecke.push(geordnet ? <ol key={schluessel()}>{eintraege}</ol> : <ul key={schluessel()}>{eintraege}</ul>);
      continue;
    }
    const absatz: string[] = [];
    while (
      i < zeilen.length &&
      zeilen[i].trim() !== '' &&
      !zeilen[i].trimStart().startsWith('```') &&
      !zeilen[i].trimStart().startsWith('|') &&
      !/^\s*([-*]|\d+\.)\s+/.test(zeilen[i])
    ) {
      absatz.push(zeilen[i++]);
    }
    bloecke.push(
      <p key={schluessel()}>
        {absatz.map((z, n) => (
          <Fragment key={n}>
            {n > 0 && <br />}
            {inline(z)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return <div className={`markdown ${klasse ?? ''}`}>{bloecke}</div>;
}

/** Text mit `Code`, **fett** und *kursiv*, ohne Absatz drumherum. */
export function Inline({ text }: { text: string }) {
  return <>{inline(text)}</>;
}
