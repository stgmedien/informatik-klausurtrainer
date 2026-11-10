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

## Was die App kann

- **Heute:** eine Tageseinheit von 25–30 Minuten (7 Einheiten bis zur Klausur), vorweg Aufwärmfragen zu fälligen Themen und aus dem Fehlerheft.
- **Kann-Liste:** alle 30 Lernziele mit Stand *offen → geübt → sicher → klausurfest*.
- **Üben:** alle Lektionen und rund 100 Aufgaben nach Thema, dazu endlos neue Logik-Aufgaben.
- **Aufgabenarten:** Zuordnen, Auswahl, Lücken, Reihenfolge, Wahrheitstabelle, Ausdruck schrittweise auswerten, Klassendiagramm lesen und modellieren, Freitext nach Erwartungshorizont, Ablauf vorhersagen, Programmieren im Papier-Modus, Fehler finden, Zeilen ordnen, Struktogramm lesen, überführen und zeichnen.
- **Werkstatt:** eigenen Java-Code in der Spinnenwelt ausführen und Schritt für Schritt verfolgen – mit Struktogramm, Variablen und Konsole.
- **Fehlerheft:** sammelt Fehlversuche nach Fehlermuster und legt sie nach einem bzw. drei Tagen wieder vor.
- **Probeklausur:** 30 oder 90 Minuten unter Klausurbedingungen, Auswertung mit Notenschätzung, Druckansicht für Papier.
- **Spickzettel:** alle Merksätze (mit eigenem Wortlaut aus dem Heft überschreibbar) und die NRW-Operatoren.

## KI-Unterstützung

Mit eingerichtetem Schlüssel korrigiert die KI Freitexte und Klassendiagramme nach Erwartungshorizont, gibt gestufte Hinweise zum eigenen Entwurf und erklärt Fehler in Programmen. Ohne Schlüssel funktioniert alles andere genauso; Freitexte prüfst du dann selbst.

1. Datei `.env.example` kopieren und die Kopie `.env.local` nennen.
2. In `.env.local` hinter `ANTHROPIC_API_KEY=` den Schlüssel eintragen.

Der Schlüssel bleibt auf diesem Rechner: Er wird nur vom lokalen Server gelesen, nie an den Browser gegeben und nicht in Git gesichert. Änderungen an `.env.local` übernimmt die laufende App automatisch.

## Lernstand

Der Lernstand liegt in `daten/lernstand.json`, eine tägliche Sicherungskopie in `daten/backup/`.

## Tests

```bash
npm test
```

Die Tests prüfen den Kern (Spinnenwelt nach `Spinne.java`, Java-Interpreter mit Fehlermeldungen, Logik, Struktogramme, Klassenmodell) und den Aufgabenpool: Jede Musterlösung wird in allen Testwelten ausgeführt, jede typische Fehlvariante muss erkannt werden, jede Vorhersage wird gegen den echten Programmlauf geprüft, und jedes Lernziel der Kann-Liste muss abgedeckt sein.

## Aufbau

- `src/engine/` – Kern ohne Oberfläche: `welt`, `java`, `strukto`, `logik`, `klassen`
- `src/inhalte/` – Kann-Liste, Lektionen, Aufgaben, Tageseinheiten, Probeklausuren, Fehlermuster
- `src/lernen/` – Lernstand, Bewertung, Programmprüfung, Fehlerheft, Planer, Notenschätzung
- `src/ui/` – Oberfläche
- `server/` – lokale `/api`-Routen (Lernstand, KI-Korrektur, Tutor, Fehlerdiagnose)
