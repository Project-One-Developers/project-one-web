<p align="center">
  <img src="public/logo.png" alt="Project One Web Logo" width="200"/>
</p>
<h1 align="center">Project One Web</h1>
<p align="center">A web application built with Next.js to help World of Warcraft guild leaders manage their roster, raid attendance, and loot distribution.</p>

## Features

- **Roster Management**: Track guild members, their roles, classes, and specializations
- **Droptimizers Tracker**: Track RaidBots' droptimizers results to show the DPS upgrades for each member
- **BiS List Tracker**: Track a customizable BiS List for each specialization
- **Raid Sessions**: Create and schedule raid events with automatic role composition checks
- **Loot Tracking**: Record and distribute raid loot with customizable loot systems
- **Tier Set Management**: Track tier set pieces of each member over multiple pages, making it easier to manage tier set assignments
- **Discord Integration**: Role-based access control using your Discord server roles

## Getting Started

### Prerequisites

- Node.js (v24+)
- pnpm
- PostgreSQL database
- [direnv](https://direnv.net/) (optional, for automatic environment setup)
- [nvm](https://github.com/nvm-sh/nvm) (optional, for Node version management)

### Setup with direnv + nvm

If you have direnv and nvm installed, the project will automatically:

- Switch to the correct Node.js version (via `.nvmrc`)
- Load environment variables from `.env` and `.env.local`

```bash
direnv allow
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable                | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL connection string                             |
| `AUTH_SECRET`           | Session encryption key (generate with `npx auth secret`) |
| `AUTH_DISCORD_ID`       | Discord OAuth app client ID                              |
| `AUTH_DISCORD_SECRET`   | Discord OAuth app client secret                          |
| `DISCORD_GUILD_ID`      | Your Discord server ID                                   |
| `DISCORD_ALLOWED_ROLES` | Comma-separated role IDs for access control              |

### Database Setup

Push the schema to your database:

```bash
pnpm drizzle-kit push
```

### Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
pnpm build
```

## Tech Stack

- **Next.js 15**: React framework with App Router
- **React 19**: UI library
- **TypeScript**: Type-safe JavaScript
- **Drizzle ORM**: Type-safe database toolkit
- **PostgreSQL**: Database
- **Auth.js**: Authentication with Discord OAuth
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: UI components
- **TanStack Query**: Data fetching and caching
