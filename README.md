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

- Node.js (v20+)
- pnpm
- PostgreSQL database

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

## Deployment

The easiest way to deploy is with [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your environment variables
4. Deploy

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
