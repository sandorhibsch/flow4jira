# Database Setup

Flow4Jira uses SQLite for persistent storage of board configurations. The database is managed via Prisma ORM.

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
pnpm db:generate

# 3. Create database and apply schema
pnpm db:push

# 4. Start the app
pnpm dev
```

## Database Location

The SQLite database is stored in `./data/flow4jira.db`. This directory is gitignored.

## Available Commands

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Prisma client from schema |
| `pnpm db:push` | Push schema changes to database (dev) |
| `pnpm db:migrate` | Create migration files (production) |
| `pnpm db:studio` | Open Prisma Studio (GUI for DB) |

## Schema

```prisma
model BoardConfig {
  id              String   @id @default(cuid())
  boardId         String   @unique
  boardName       String?
  boardType       String?
  periodDays      String   @default("90")
  workflow        String   // JSON
  processedIssues String?  // JSON
  updatedAt       DateTime @updatedAt
}
```

## Environment Variables

Create a `.env` or `.env.local` file:

```env
DATABASE_URL="file:./data/flow4jira.db"
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| GET | `/api/boards/[boardId]/config` | Get board config |
| PUT | `/api/boards/[boardId]/config` | Create/update board config |
| DELETE | `/api/boards/[boardId]/config` | Delete board config |

## Architecture

```
src/lib/
├── db/
│   └── prisma.ts              # Prisma client singleton
├── repositories/
│   ├── board-config.types.ts      # Types
│   ├── board-config.repository.ts # Interface
│   ├── board-config.sqlite.repository.ts # SQLite impl
│   └── board-config.mock.repository.ts   # Mock for tests
└── services/
    └── board-config.service.ts    # Service facade
```

## Migrating from localStorage

If you have existing data in localStorage, it will need to be manually migrated. The old `WorkflowConfigService` (localStorage) is deprecated in favor of `BoardConfigService` (SQLite).
