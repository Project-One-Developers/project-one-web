# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Next.js 16 + React 19 TypeScript web application for World of Warcraft guild management and loot distribution. Uses pnpm as package manager.

## Common Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript check (shows ALL errors, faster than build)
pnpm drizzle-kit push # Push database schema changes to PostgreSQL
```

> **Tip**: Use `pnpm typecheck` instead of `pnpm build` when checking for type errors - it shows all errors at once and is faster.

## Architecture

### Directory Structure

- `src/app/` - Next.js App Router pages and API routes
    - `(auth)/` - Auth layout group (login page)
    - `(dashboard)/` - Protected routes (roster, raid-session, droptimizer, loot-table, etc.)
    - `api/cron/` - Scheduled sync endpoints for external data
- `src/actions/` - Server Actions for mutations (RPC-style handlers)
- `src/db/` - Database layer
    - `schema.ts` - Drizzle ORM schema definitions
    - `repositories/` - Data access layer functions per entity
- `src/components/` - React components
    - `ui/` - shadcn/ui base components
    - `wow/` - WoW-specific display components
- `src/lib/` - Utilities and integrations
    - `queries/` - React Query hooks for data fetching
    - `blizzard/`, `discord/`, `droptimizer/` - External API clients
- `src/shared/` - Shared domain logic
    - `schemas/` - Zod validation schemas
    - `consts/wow.consts.ts` - WoW game constants
    - `types/types.ts` - TypeScript type definitions

### Key Patterns

**Data Flow**: Server Actions (`/actions`) for mutations + React Query hooks (`/lib/queries`) for fetching

**Repository Pattern**: Each entity has a repository object in `/db/repositories` (e.g., `characterRepo.getList()`, `itemRepo.getAll()`)

**Validation**: Zod schemas in `/shared/schemas` for both DB response and form validation

**Authentication**: Auth.js with Discord OAuth, role-based access via Discord server roles

**UI**: shadcn/ui components with Tailwind CSS 4, `cn()` utility for class merging, CVA for variants

**Template Literals**: Use `s()` from `@/lib/safe-stringify` for non-string values in template literals (ESLint requires this):

```typescript
import { s } from "@/lib/safe-stringify"

// ✓ Good
logger.info(`Synced ${s(count)} characters`)

// ✗ Bad - ESLint error
logger.info(`Synced ${count} characters`)
```

**Database**: Drizzle ORM with PostgreSQL, lazy connection via Proxy pattern, pgEnum for WoW constants

**Environment Variables**: Validated at startup via Zod schema in `src/env.ts`. Import `env` object for type-safe access:

```typescript
import { env } from "@/env"

env.DATABASE_URL // typed and validated
```

### Naming Conventions

- Components: PascalCase (`CharacterDialog.tsx`)
- Actions: camelCase (`addCharacter`, `getBosses`) - no suffix needed, they live in `/actions`
- Repositories: camelCase + `Repo` suffix (`characterRepo`, `itemRepo`)
- Schemas: camelCase + `Schema` suffix (`characterSchema`)
- Hooks: `use` prefix (`usePlayersSummary()`)
- Constants: SCREAMING_SNAKE_CASE (`CURRENT_RAID_ID`)

## External Integrations

- **Blizzard API**: Character profiles, equipment, and raid progression (primary data source)
- **RaidBots**: Droptimizer parsing for DPS upgrade calculations
- **Discord**: Bot integration for notifications and OAuth
