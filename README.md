# Game of Throws

> The world's largest cricket network. A CricHeroes-style platform for players, organizers, scorers, umpires and fans — built as a full-stack web app.

This is a production-grade skeleton: real backend, real database, real auth. It ships with a polished marketing landing page, an authenticated app shell, ball-by-ball live scoring, tournaments, teams and player profiles with stats.

## Tech stack

- **Frontend**: Next.js 14 (App Router) · React 18 · TypeScript
- **Styling**: Tailwind CSS (custom brand palette + utility components)
- **Database**: Prisma ORM + SQLite (swap to Postgres in one line)
- **Auth**: NextAuth (Credentials provider, bcrypt-hashed passwords, JWT sessions)
- **Validation**: Zod

## Quick start

```bash
# 1) Install dependencies
npm install

# 2) Configure env
cp .env.example .env
# (edit NEXTAUTH_SECRET — anything long & random)

# 3) Create the database
npm run db:push

# 4) Seed demo data (one tournament, 4 teams, 44 players, 2 matches)
npm run db:seed

# 5) Start dev server
npm run dev
# open http://localhost:3000
```

Demo login (after seeding):
- Email: `demo@gameofthrows.com`
- Password: `password123`

Or click **Get started** to sign up a new account.

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Start Next.js dev server                      |
| `npm run build`    | Build for production (generates Prisma too)   |
| `npm run start`    | Run the built app                             |
| `npm run db:push`  | Push Prisma schema to SQLite (no migrations)  |
| `npm run db:seed`  | Seed demo organizer + tournament + teams      |
| `npm run db:studio`| Open Prisma Studio (DB GUI)                   |
| `npm run lint`     | Lint                                          |

## What's built

### Public marketing site (`/`)
- Hero with brand visual + phone mockup of live scoring
- Stats strip (cricketers / tournaments / matches / balls)
- Features grid (live scoring, tournament mgmt, profiles, streaming, highlights, community)
- Roles section (Players, Organizers, Scorers, Umpires, Fans)
- Testimonials
- CTA + footer with app download placeholders

### Authentication
- `POST /api/register` — create user (Zod-validated, bcrypt-hashed)
- `/login` and `/signup` pages
- NextAuth credentials provider with JWT sessions
- `/dashboard` and everything under `(app)/` is protected — unauthenticated users are redirected to `/login`

### App (authenticated)
- `/dashboard` — counts, live matches, upcoming matches
- `/tournaments` — list of tournaments with team/match counts
- `/tournaments/new` — create a tournament (form → API)
- `/tournaments/[id]` — detail with **Teams**, **Fixtures** and **Points table**
- `/teams`, `/teams/[id]` — team list and squad view
- `/players`, `/players/[id]` — player list and **profile with batting + bowling stats** computed from ball-by-ball data
- `/matches`, `/matches/[id]` — match list and live scorecard with recent balls
- `/matches/[id]/score` — **ball-by-ball live scoring** UI:
  - Start a new innings (pick batting team)
  - Striker / non-striker / bowler dropdowns
  - Runs 0–6 buttons
  - Extras toggles (wide, no-ball, bye, leg-bye)
  - Wicket button
  - Undo last ball
  - Auto strike rotation on odd runs

### Data model (`prisma/schema.prisma`)

```
User ─< Tournament ─< Team ─< Player
                      │           │
                      ├──< Match ─┤
                            │
                            └─< Innings ─< Ball
```

A `Ball` references striker, non-striker, bowler and (optional) out-batsman, plus runs, extras, wicket type and free-text commentary. This lets the player profile page derive **batting average, strike rate, fours, sixes, wickets, economy** purely from event data — no denormalised stat tables to keep in sync.

### API surface

| Method | Path                                                            | Purpose                          |
| ------ | --------------------------------------------------------------- | -------------------------------- |
| POST   | `/api/register`                                                 | Create user                      |
| GET    | `/api/auth/[...nextauth]`                                       | NextAuth handler                 |
| GET/POST | `/api/tournaments`                                            | List / create tournaments        |
| GET    | `/api/tournaments/[id]`                                         | Tournament detail                |
| GET/POST | `/api/teams`                                                  | List / create teams              |
| GET/POST | `/api/players`                                                | List / create players            |
| GET/POST | `/api/matches`                                                | List / create matches            |
| POST   | `/api/matches/[id]/innings`                                     | Start an innings                 |
| POST   | `/api/matches/[id]/innings/[inningsId]/balls`                   | Record a ball                    |
| DELETE | `/api/matches/[id]/innings/[inningsId]/balls/[ballId]`          | Undo (delete) a ball             |

All write endpoints require an authenticated session.

## Project structure

```
game-of-throws/
├── prisma/
│   ├── schema.prisma         # data model
│   └── seed.ts               # demo data
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/           # public auth pages (login, signup)
│   │   ├── (app)/            # protected app shell (dashboard, etc.)
│   │   │   ├── dashboard/
│   │   │   ├── tournaments/
│   │   │   ├── teams/
│   │   │   ├── players/
│   │   │   └── matches/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── register/
│   │   │   ├── tournaments/
│   │   │   ├── teams/
│   │   │   ├── players/
│   │   │   └── matches/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # landing
│   │   ├── providers.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── landing/          # hero, features, roles, cta, testimonials
│   │   ├── AppShellNav.tsx
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── Logo.tsx
│   │   └── ScoreEntry.tsx    # live scoring UI
│   └── lib/
│       ├── prisma.ts
│       ├── auth.ts
│       └── utils.ts
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Branding

- Name: **Game of Throws**
- Primary: `brand-700` `#c1272d` (deep crimson)
- Ink (text/dark surfaces): `ink-900` `#0f1024`
- Typography: Poppins (display) + Inter (body), loaded from Google Fonts in `app/layout.tsx`

## Switching to Postgres (later)

1. Change `provider = "postgresql"` and `DATABASE_URL` in `prisma/schema.prisma` and `.env`
2. `npx prisma migrate dev` — Prisma will manage migrations

## Roadmap (what's intentionally NOT built yet)

A real CricHeroes is years of work. This skeleton is a strong foundation — here's the natural next bite-sized roadmap:

- [ ] Fixtures auto-generator (round-robin + knockouts)
- [ ] Live match WebSocket / SSE so spectators see ball-by-ball updates without refresh
- [ ] Match summary / scorecard view (detailed batting + bowling card per innings)
- [ ] Innings close & second-innings target tracking
- [ ] Bowler-over linking & "current over" UI on scoring screen
- [ ] Image upload (team logos, player avatars) — wire to S3 / R2 / UploadThing
- [ ] OAuth providers (Google, Apple) in NextAuth
- [ ] Tournament wall / news feed
- [ ] Live stream embed + auto score overlay
- [ ] Public sharable scorecard pages with OG image generation
- [ ] Mobile app (Capacitor or React Native) reusing the same API

## License

Internal scaffold — pick a license before publishing.
