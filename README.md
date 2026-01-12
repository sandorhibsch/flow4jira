# Flow4Jira

Flow-Metriken und Forecasting für Jira Boards – basierend auf Kanban-Prinzipien.

## 🎯 Features

- **Aging Chart** – Zeigt wie lange Items in jedem Status verweilen
- **Cumulative Flow Diagram (CFD)** – Visualisiert den Arbeitsfluss über Zeit
- **Cycle Time Scatterplot** – Analysiert Durchlaufzeiten mit Perzentilen
- **Monte Carlo Forecasting** – Probabilistische Vorhersagen:
  - "Wie viele Items schaffen wir in X Tagen?"
  - "Wann sind X Items fertig?"
- **Konfigurierbarer Workflow** – Mappe beliebige Jira-Status auf Flow-Stages

## 📋 Voraussetzungen

- **Node.js** 20+ (LTS)
- **pnpm** (empfohlen) oder npm
- **Jira Server** oder **Jira Cloud** Zugang

## 🚀 Quick Start

### 1. Repository klonen / entpacken

```bash
# Falls als ZIP
unzip flow4jira.zip
cd flow4jira
```

### 2. Environment einrichten

```bash
# Environment-Datei erstellen
cp .env.example .env

# .env bearbeiten und Jira-Credentials eintragen
```

**Für Jira Server:**
```env
JIRA_INSTANCE_TYPE=server
JIRA_BASE_URL=https://jira.your-company.com
JIRA_PERSONAL_ACCESS_TOKEN=your-token-here
DATABASE_URL="file:./data/flow4jira.db"
```

**Für Jira Cloud:**
```env
JIRA_INSTANCE_TYPE=cloud
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
DATABASE_URL="file:./data/flow4jira.db"
```

### 3. Dependencies installieren

```bash
pnpm install
```

### 4. Datenbank initialisieren

```bash
# Prisma Client generieren + Datenbank erstellen
npx prisma db push
```

### 5. Anwendung starten

```bash
# Entwicklungsserver
pnpm dev

# Oder Production Build
pnpm build
pnpm start
```

Öffne **http://localhost:3000** im Browser.

## 📖 Verwendung

### Board konfigurieren

1. Gehe zu **http://localhost:3000**
2. Klicke auf ein Board oder erstelle eine neue Konfiguration
3. Gib die **Board ID** ein (findest du in der Jira-URL deines Boards)
4. Klicke **Fetch Board** um Board-Informationen zu laden
5. Konfiguriere den **Workflow**:
   - Erstelle Stages (z.B. "To Do", "In Progress", "Done")
   - Mappe Jira-Status auf Stages
   - Markiere **Cycle Start** und **Cycle End** für Cycle-Time-Berechnung
6. Klicke **Save**

### Metriken analysieren

1. Gehe zur Board-Ansicht
2. Wähle den **Analysezeitraum** (z.B. 30 Tage)
3. Optional: Füge **JQL-Filter** hinzu
4. Klicke **Load Issues**

Die Charts werden automatisch generiert.

## 🗂️ Projektstruktur

```
flow4jira/
├── prisma/
│   └── schema.prisma          # Datenbank-Schema
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # REST API Endpoints
│   │   │   ├── boards/        # Board Config API
│   │   │   ├── flow/          # Flow Metrics API
│   │   │   └── jira/          # Jira Proxy API
│   │   └── boards/            # UI Pages
│   │       └── [boardId]/
│   │           ├── page.tsx           # Metriken-Ansicht
│   │           └── configure/page.tsx # Workflow-Konfiguration
│   ├── components/ui/         # UI-Komponenten
│   ├── hooks/                 # React Hooks
│   ├── lib/
│   │   ├── api/               # API Client
│   │   ├── db/                # Prisma Client
│   │   ├── flow/              # Flow-Verarbeitung
│   │   ├── jira/              # Jira Client
│   │   ├── metrics/           # Metriken-Berechnung
│   │   ├── repositories/      # Datenzugriff
│   │   └── services/          # Business Logic
│   └── ui/                    # Chart-Komponenten
├── .env.example               # Environment Template
├── package.json
└── README.md
```

## 🔧 Nützliche Befehle

```bash
# Entwicklung
pnpm dev                    # Dev-Server mit Turbopack

# Datenbank
npx prisma studio           # Datenbank-GUI öffnen
npx prisma db push          # Schema synchronisieren
npx prisma generate         # Client neu generieren

# Tests
pnpm test                   # Alle Tests ausführen

# Build
pnpm build                  # Production Build erstellen
pnpm start                  # Production Server starten

# Linting
pnpm lint                   # ESLint ausführen
```

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                        UI (React)                           │
│  - Board Metrics Page                                       │
│  - Configure Page                                           │
│  - Charts (Recharts)                                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Hooks                                │
│  - useBoardConfig                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Client                                 │
│  - boardConfigClient (fetch wrapper)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Routes                                 │
│  - /api/boards/[boardId]/config                             │
│  - /api/flow/board                                          │
│  - /api/jira/board                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Services                                   │
│  - BoardConfigService                                       │
│  - FlowHandler                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│   Repository    │   │   Jira Client   │
│   (SQLite)      │   │   (REST API)    │
└─────────────────┘   └─────────────────┘
```

## 📊 Metriken erklärt

### Cycle Time
Zeit von **Cycle Start** bis **Cycle End**. Typisch: "In Progress" bis "Done".

### Lead Time
Zeit von Erstellung bis Fertigstellung.

### Throughput
Anzahl fertiggestellter Items pro Zeiteinheit.

### Monte Carlo Simulation
Verwendet historische Throughput-Daten um probabilistische Vorhersagen zu treffen:
- **50% Konfidenz**: 50% Wahrscheinlichkeit, dass das Ergebnis erreicht wird
- **85% Konfidenz**: Konservative Schätzung (empfohlen für Planung)
- **95% Konfidenz**: Sehr konservative Schätzung

## 🔒 Sicherheit

- Jira-Credentials werden nur serverseitig verwendet
- Kein Client-seitiger Zugriff auf API-Tokens
- SQLite-Datenbank speichert nur Konfiguration, keine Jira-Daten

## 🐛 Troubleshooting

### "Cannot find module '@prisma/client'"
```bash
npx prisma generate
```

### "Database does not exist"
```bash
npx prisma db push
```

### "Board configuration not found"
Das Board muss erst über `/boards/{id}/configure` konfiguriert werden.

### "Jira API request failed"
- Prüfe JIRA_BASE_URL (kein trailing slash)
- Prüfe API-Token / Personal Access Token
- Prüfe Netzwerk-Zugriff auf Jira

## 📝 Changelog

### v1.0.0
- Initial Release
- SQLite-Persistenz für Board-Konfigurationen
- Jira Server + Cloud Support
- Flow-Metriken: Aging, CFD, Cycle Time
- Monte Carlo Forecasting
- Clickable Charts (öffnet Issues in Jira)

## 📄 Lizenz

MIT License - Siehe LICENSE Datei
