import type { KeyboardEvent } from 'react';

interface Props {
  wert: string;
  onAendern: (wert: string) => void;
  zeilen?: number;
  gesperrt?: boolean;
  beschriftung?: string;
}

/**
 * Schlichtes Eingabefeld für Quelltext – bewusst ohne Farben und ohne automatische Einrückung,
 * wie auf Papier. Nur die Tab-Taste rückt ein (statt das Feld zu verlassen).
 */
export function CodeEingabe({ wert, onAendern, zeilen = 14, gesperrt, beschriftung = 'Quelltext' }: Props) {
  const taste = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    const feld = e.currentTarget;
    const { selectionStart: a, selectionEnd: b } = feld;
    const zeilenAnfang = wert.lastIndexOf('\n', a - 1) + 1;
    if (e.shiftKey) {
      // Shift+Tab: bis zu vier Leerzeichen am Zeilenanfang entfernen.
      const weg = /^ {1,4}/.exec(wert.slice(zeilenAnfang))?.[0].length ?? 0;
      if (weg === 0) return;
      onAendern(wert.slice(0, zeilenAnfang) + wert.slice(zeilenAnfang + weg));
      requestAnimationFrame(() => feld.setSelectionRange(Math.max(zeilenAnfang, a - weg), Math.max(zeilenAnfang, b - weg)));
      return;
    }
    onAendern(`${wert.slice(0, a)}    ${wert.slice(b)}`);
    requestAnimationFrame(() => feld.setSelectionRange(a + 4, a + 4));
  };

  return (
    <textarea
      className="code-eingabe"
      rows={zeilen}
      value={wert}
      disabled={gesperrt}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      autoComplete="off"
      aria-label={beschriftung}
      onKeyDown={taste}
      onChange={(e) => onAendern(e.target.value)}
    />
  );
}
