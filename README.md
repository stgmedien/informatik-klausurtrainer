# Spinnen-Trainer

Klausurtraining Informatik EF: objektorientierte Programmierung mit der Greenfoot-Spinnenwelt.

## Starten

```bash
npm install
```

```bash
npm run dev
```

Danach im Browser öffnen: <http://localhost:5199>

## KI-Unterstützung einrichten (optional)

1. Datei `.env.example` kopieren und die Kopie `.env.local` nennen.
2. In `.env.local` hinter `ANTHROPIC_API_KEY=` den Schlüssel eintragen.
3. Die App neu starten.

Der Schlüssel bleibt auf diesem Rechner: Er wird nur vom lokalen Server gelesen, nie an den Browser gegeben und nicht in Git gesichert. Ohne Schlüssel funktioniert die App ebenfalls; Freitext-Antworten prüfst du dann selbst anhand des Erwartungshorizonts.

## Lernstand

Der Lernstand liegt in `daten/lernstand.json`, eine tägliche Sicherungskopie in `daten/backup/`.

## Tests

```bash
npm test
```

Die Tests prüfen den Kern (Logik, Klassenmodell, Spinnenwelt, Java-Interpreter) und den Aufgabenpool: Jede Wahrheitstabelle und jede Klassendiagramm-Lösung wird berechnet, und jedes Lernziel der Kann-Liste muss durch Aufgaben abgedeckt sein.

## Aufbau

- `src/engine/` – Kern ohne Oberfläche: `logik`, `klassen`, `welt`, `java`
- `src/inhalte/` – Kann-Liste, Lektionen, Aufgaben, Tageseinheiten
- `src/lernen/` – Lernstand, Bewertung, Planer
- `src/ui/` – Oberfläche
- `server/` – lokale `/api`-Routen (Lernstand, KI)
