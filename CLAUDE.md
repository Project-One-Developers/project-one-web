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

**UI**: shadcn/ui components with Tailwind CSS 4, `cn()` utility for class merging, CVA for variants. See [Design System](#design-system) below for custom components

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

### Server Actions with next-safe-action

All mutations use `next-safe-action` for type-safe server actions with automatic validation and error handling.

**Defining Actions** (`src/actions/`):

```typescript
import { z } from "zod"
import { authActionClient } from "@/lib/safe-action"

// Use authActionClient for protected actions (requires auth)
export const addCharacter = authActionClient
    .inputSchema(z.object({
        name: z.string().min(1),
        realm: z.string().min(1),
        playerId: z.uuid(),
    }))
    .action(async ({ parsedInput }) => {
        const character = await characterRepo.create(parsedInput)
        return character // Automatically wrapped in success response
    })

// For user-facing errors, throw ActionError
import { ActionError } from "@/lib/safe-action"

export const addCharacterWithSync = authActionClient
    .inputSchema(newCharacterSchema)
    .action(async ({ parsedInput }) => {
        const profile = await fetchProfile(parsedInput.name)
        if (!profile) {
            throw new ActionError(`Character "${parsedInput.name}" not found`)
        }
        return await characterRepo.create(parsedInput)
    })
```

**Query Hooks** (`src/lib/queries/`):

```typescript
import { useAction } from "next-safe-action/hooks"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export function useAddCharacter() {
    const queryClient = useQueryClient()

    return useAction(addCharacter, {
        onSuccess: ({ data }) => {
            // data is non-null here - access directly without ?. or !
            toast.success(`Character ${data.name} added`)
            void queryClient.invalidateQueries({ queryKey: [queryKeys.characters] })
        },
        onError: ({ error }) => {
            toast.error(error.serverError ?? "Failed to add character")
        },
    })
}
```

**Component Usage**:

```typescript
// Get the hook
const { execute, executeAsync, isExecuting } = useAddCharacter()

// Option 1: Fire and forget (callbacks handle success/error)
execute({ name: "Thrall", realm: "Draenor", playerId: "..." })

// Option 2: Await result for conditional logic
const result = await executeAsync(data)
if (result.data) {
    setOpen(false) // Close dialog on success
}
// Note: result is always defined, use result.data not result?.data

// Loading state
<Button disabled={isExecuting}>
    {isExecuting ? "Saving..." : "Save"}
</Button>
```

**Form Handlers** - wrap async handlers with `void` to satisfy ESLint:

```tsx
// ✓ Good
<form onSubmit={(e) => void handleSubmit(e)}>

// ✗ Bad - ESLint no-misused-promises error
<form onSubmit={handleSubmit}>
```

**Key Rules**:
- Use `z.uuid()` not `z.string().uuid()` (deprecated)
- Use `z.url()` not `z.string().url()` (deprecated)
- Use `.inputSchema()` not `.schema()` (deprecated)
- In `onSuccess`, `data` is non-null - access `data.property` directly
- `result` from `executeAsync` is always defined - use `result.data` not `result?.data`

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

## Design System

Custom reusable components in `src/components/ui/` built with CVA (Class Variance Authority) for consistent styling across the app.

### Core Components

| Component        | File                  | Purpose                                                       |
| ---------------- | --------------------- | ------------------------------------------------------------- |
| `GlassCard`      | `glass-card.tsx`      | Glassmorphic container - the foundation for cards and panels  |
| `StatBadge`      | `stat-badge.tsx`      | Metric pills for displaying stats (count, averages, warnings) |
| `EmptyState`     | `empty-state.tsx`     | Empty/not-found states with icon, title, description          |
| `LoadingSpinner` | `loading-spinner.tsx` | Animated spinner with glow effect                             |
| `IconButton`     | `icon-button.tsx`     | Icon-only buttons (back, delete, FABs)                        |
| `SectionHeader`  | `section-header.tsx`  | Panel/section titles (uppercase, tracking)                    |

### Usage Guidelines

**Always prefer design system components over raw Tailwind classes** for these patterns:

```tsx
// ✓ Good - Use GlassCard for containers
<GlassCard interactive padding="lg">
  <h2>Title</h2>
  <p>Content</p>
</GlassCard>

// ✗ Bad - Don't repeat glassmorphic classes manually
<div className="bg-card/40 backdrop-blur-sm border border-border/40 rounded-2xl p-5 hover:border-primary/30">
  ...
</div>
```

```tsx
// ✓ Good - Use StatBadge for metrics
<StatBadge variant="warning" icon={<AlertTriangle />} label="Low Gear" value={5} />

// ✗ Bad - Don't build stat pills manually
<div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 rounded-full border border-orange-500/30">
  ...
</div>
```

```tsx
// ✓ Good - Use EmptyState for empty/error states
<EmptyState
  icon={<Users className="w-8 h-8" />}
  title="No players found"
  description="Add your first player to get started"
  action={<Button>Add Player</Button>}
/>

// ✓ Good - Use LoadingSpinner for loading states
<LoadingSpinner size="lg" text="Loading roster..." />
```

### Component Variants

**GlassCard** variants:

- `variant`: `default` | `solid` | `subtle` - background opacity
- `interactive`: `true` | `false` - adds hover effects
- `padding`: `none` | `sm` | `default` | `lg` | `xl`
- `rounded`: `default` (2xl) | `lg` (xl) | `md` (lg) | `full`

**StatBadge** variants:

- `variant`: `default` | `primary` | `warning` | `success` | `info`
- Auto-colors label and value text based on variant

**IconButton** variants:

- `variant`: `default` | `ghost` | `destructive` | `primary` | `secondary`
- `size`: `sm` | `default` | `lg`

**EmptyState** / **LoadingSpinner** sizes:

- `size`: `sm` | `default` | `lg` | `full`

### Creating New Components

When creating new reusable UI components, follow this pattern:

```tsx
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { cn } from "@/lib/utils"

// 1. Define variants with CVA
const myComponentVariants = cva("base-classes-here", {
    variants: {
        variant: {
            default: "default-classes",
            primary: "primary-classes",
        },
        size: {
            sm: "small-classes",
            default: "default-classes",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
    },
})

// 2. Define props type (use `type`, not `interface`)
export type MyComponentProps = React.HTMLAttributes<HTMLDivElement> &
    VariantProps<typeof myComponentVariants> & {
        customProp?: string
    }

// 3. Create component with forwardRef
const MyComponent = React.forwardRef<HTMLDivElement, MyComponentProps>(
    ({ className, variant, size, customProp, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(myComponentVariants({ variant, size }), className)}
                {...props}
            />
        )
    }
)
MyComponent.displayName = "MyComponent"

// 4. Export component and variants
export { MyComponent, myComponentVariants }
```

### Style Tokens (Common Patterns)

When you need to use raw classes, prefer these consistent patterns:

| Pattern          | Classes                                                              | Use For                           |
| ---------------- | -------------------------------------------------------------------- | --------------------------------- |
| Glass background | `bg-card/40 backdrop-blur-sm`                                        | Containers, panels                |
| Glass border     | `border border-border/40`                                            | Card borders                      |
| Hover glow       | `hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5`     | Interactive elements              |
| Muted text       | `text-muted-foreground`                                              | Secondary text                    |
| Very muted       | `text-muted-foreground/60`                                           | Tertiary/placeholder text         |
| Section title    | `text-xs font-medium uppercase tracking-wider text-muted-foreground` | Panel headers                     |
| Rounded modern   | `rounded-2xl`                                                        | Cards, large containers           |
| Rounded medium   | `rounded-xl`                                                         | Buttons, inputs, smaller elements |
| Main indicator   | `text-amber-400` + `bg-amber-500/20`                                 | Main character badges             |
| Warning          | `text-orange-400` + `bg-orange-500/10`                               | Low gear, warnings                |
| Info             | `text-blue-400`                                                      | Item levels, stats                |

### WoW-Specific Components

Located in `src/components/wow/`:

- `CharacterOverviewIcon` - Character icons with ilvl badges and main indicator
- `WowClassIcon` - Class icon display
- `WowCharacterLink` - External links (Raider.io, WarcraftLogs, Armory)
- `WowGearIcon` - Gear item display with tooltips
- `WowCurrencyIcon` - Currency display
