# Flow4Jira

Flow metrics and forecasting for Jira Boards 

## 🎯 Features

- **Aging Chart** – Age of items currently in the process, categorized by status. 
- **Cumulative Flow Diagram (CFD)** – Visualization of workflow over time
- **Cycle Time Scatterplot** – Cycle time of items over time and single item forecasting using percentiles
- **Monte Carlo Forecasting** – Probabilistic forecasts
  - "How many items are we going to finish in the next X days?"
  - "When can we finish X items?"
- **Configurable workflows** – Map Jira statuses in your board to workflow stages

## Requirements

- **Node.js** 20+ (LTS)
- **pnpm** (recommended) or npm
- Jira Server/Data Center or Jira Cloud access
- Docker Desktop and Docker Compose (for Docker deployment)

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/sandorhibsch/flow4jira.git
cd flow4jira
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure the deployment mode

Copy the template and edit the values:

```bash
cp .env.example .env.local
```

There are two supported modes.

| Mode | `NEXT_PUBLIC_PERSISTENCE_MODE` | Board storage | Jira credentials |
| --- | --- | --- | --- |
| Browser/local | `local` | Browser `localStorage` | Configured in the browser via **Edit Jira config** |
| Server/Postgres | `server` | PostgreSQL | Server environment variables only |

For a public deployment, keep `NEXT_PUBLIC_PERSISTENCE_MODE=local`. No database or server-side Jira credentials are required; each browser keeps its own configuration and Jira credentials.

For an internal deployment, set `NEXT_PUBLIC_PERSISTENCE_MODE=server` and configure `DATABASE_URL` plus Jira variables in `.env`. In this mode, credentials are never sent by the browser or stored in local storage.

Jira authentication depends on `JIRA_INSTANCE_TYPE`:

- `server` (Jira Server/Data Center): set `JIRA_BASE_URL` and `JIRA_PERSONAL_ACCESS_TOKEN`.
- `cloud` (Jira Cloud): set `JIRA_BASE_URL`, `JIRA_EMAIL`, and `JIRA_API_TOKEN`.

### 4. Run locally

```bash
pnpm dev
```

For server persistence, start PostgreSQL first and apply migrations:

```bash
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

## Run with Docker

Docker Compose starts Flow4Jira and PostgreSQL for an internal, persistent deployment.

1. Copy and configure the environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Set `NEXT_PUBLIC_PERSISTENCE_MODE=server` and the Jira settings described above. Set `DATABASE_URL` to `postgresql://postgres:postgres@postgres:5432/flow4jira_dev`; `postgres` is the database container hostname visible to the app container.

3. Build and start the services:

   ```bash
   docker compose up --build
   ```

   The application is available at `http://localhost:3000`. The app container installs dependencies, deploys Prisma migrations, generates Prisma Client, and starts Next.js.

4. Stop the services when finished:

   ```bash
   docker compose down
   ```

   PostgreSQL data persists in the `postgres_dev_data` Docker volume. To remove that data deliberately, run `docker compose down -v`.

### Production Docker image

Build the image with `docker build -t flow4jira .`. Supply the same server-mode environment variables at runtime, use a reachable PostgreSQL `DATABASE_URL`, and run migrations before or during deployment:

```bash
pnpm db:migrate
```

Do not commit `.env.local`; it contains Jira credentials.

## Testing

Run unit tests with `pnpm test` and unit coverage with
`pnpm test:coverage --runInBand`. Postgres integration tests require Docker and
run separately. See [Testing and coverage](docs/testing.md) for suite boundaries,
coverage scope, and the baseline ratchet policy.

## License

Flow4Jira is licensed under the [Apache License 2.0](LICENSE).
