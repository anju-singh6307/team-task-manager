================================================================================
                        TEAM TASK MANAGER
           Full-Stack Project Management & Collaboration App
================================================================================

GITHUB   : https://github.com/anju-singh6307/team-task-manager
BACKEND  : Express.js + Prisma + PostgreSQL  (deployed on Railway)
FRONTEND : React + Vite + Tailwind CSS       (deployed on Vercel)

--------------------------------------------------------------------------------
TABLE OF CONTENTS
--------------------------------------------------------------------------------

  1. Project Overview
  2. Tech Stack
  3. Features
  4. Project Structure
  5. Prerequisites
  6. Local Setup
  7. Environment Variables
  8. API Endpoints
  9. Role System
 10. Deployment
 11. Scripts Reference

--------------------------------------------------------------------------------
1. PROJECT OVERVIEW
--------------------------------------------------------------------------------

Team Task Manager is a full-stack web application that allows teams to:

  - Register and authenticate securely with JWT
  - Create and manage Teams
  - Organise work into Projects inside each Team
  - Create, assign, and track Tasks inside each Project
  - View a personal Dashboard with Total / Completed / Overdue task stats
  - Control access with a three-tier role system (System → Team → Project)

--------------------------------------------------------------------------------
2. TECH STACK
--------------------------------------------------------------------------------

  BACKEND
  -------
  Runtime        : Node.js 20+
  Framework      : Express.js 4
  ORM            : Prisma 5
  Database       : PostgreSQL 15+
  Auth           : JSON Web Tokens (JWT) — access + refresh token pair
  Password Hash  : bcryptjs (cost factor 12)
  Validation     : express-validator
  Language       : TypeScript 5

  FRONTEND
  --------
  Framework      : React 18
  Build Tool     : Vite 5
  Styling        : Tailwind CSS 3
  Routing        : React Router v6
  HTTP Client    : Axios (with refresh-token interceptor)
  Forms          : React Hook Form
  Icons          : Lucide React
  Language       : TypeScript 5

  DEPLOYMENT
  ----------
  Backend        : Railway  (https://railway.app)
  Frontend       : Vercel   (https://vercel.com)

--------------------------------------------------------------------------------
3. FEATURES
--------------------------------------------------------------------------------

  AUTHENTICATION
  - Register with name, email, password (strength rules enforced)
  - Login returns access token (15 min) + refresh token (7 days)
  - Refresh token rotation — old token invalidated on every refresh
  - Logout / Logout-all-devices
  - Session restore on page reload via stored refresh token
  - Timing-safe login (dummy bcrypt compare prevents user enumeration)

  DASHBOARD
  - Total tasks assigned to you
  - Completed tasks with % progress bar
  - Overdue tasks count (card turns red when > 0)
  - Recent Tasks list (last 5)
  - Overdue Tasks list sorted by most overdue first

  TEAMS
  - Create a team (creator becomes OWNER)
  - Invite members and assign roles (OWNER / ADMIN / MEMBER)
  - Remove members; leave a team

  PROJECTS
  - Create projects inside a team
  - Status: PLANNING / ACTIVE / ON_HOLD / COMPLETED / ARCHIVED
  - Set start and end dates
  - Project member roles: MANAGER / CONTRIBUTOR / VIEWER
  - Task count and member avatars on each card
  - Filter projects by status

  TASKS
  - Create tasks inside a project
  - Status: TODO / IN_PROGRESS / IN_REVIEW / DONE / CANCELLED
  - Priority: LOW / MEDIUM / HIGH / URGENT
  - Assign to any project member
  - Due date with overdue highlighting
  - Position field for Kanban ordering

  ROLES & PERMISSIONS
  - System level  : ADMIN can access everything; USER is default
  - Team level    : OWNER > ADMIN > MEMBER
  - Project level : MANAGER > CONTRIBUTOR > VIEWER

--------------------------------------------------------------------------------
4. PROJECT STRUCTURE
--------------------------------------------------------------------------------

  team-task-manager/
  ├── prisma/
  │   └── schema.prisma          # DB models: User, Team, Project, Task, etc.
  ├── src/
  │   ├── controllers/           # Route handlers (auth, user, team, project, task)
  │   ├── middleware/
  │   │   ├── auth.middleware.ts # authenticate, requireAdmin, requireTeamRole, etc.
  │   │   ├── error.middleware.ts
  │   │   └── validate.middleware.ts
  │   ├── routes/                # Express routers
  │   ├── lib/prisma.ts          # Singleton Prisma client
  │   ├── utils/jwt.ts           # sign / verify access & refresh tokens
  │   ├── types/index.ts         # Shared TypeScript types & role enums
  │   ├── app.ts                 # Express app setup
  │   └── server.ts              # Entry point
  ├── frontend/
  │   ├── src/
  │   │   ├── api/               # Axios client + API modules (projects, tasks, teams)
  │   │   ├── components/
  │   │   │   ├── layout/        # Sidebar, Navbar, Layout
  │   │   │   └── ui/            # Modal, shared components
  │   │   ├── context/
  │   │   │   └── AuthContext.tsx
  │   │   ├── pages/
  │   │   │   ├── auth/          # LoginPage, RegisterPage
  │   │   │   ├── DashboardPage.tsx
  │   │   │   ├── ProjectsPage.tsx
  │   │   │   ├── ProjectDetailPage.tsx
  │   │   │   └── TasksPage.tsx
  │   │   ├── routes/
  │   │   │   ├── AppRouter.tsx
  │   │   │   └── ProtectedRoute.tsx
  │   │   └── types/index.ts
  │   ├── vercel.json
  │   └── vite.config.ts
  ├── railway.toml
  ├── .env.example
  └── .gitignore

--------------------------------------------------------------------------------
5. PREREQUISITES
--------------------------------------------------------------------------------

  - Node.js  >= 20  (https://nodejs.org)
  - npm      >= 10
  - PostgreSQL >= 15 running locally OR a remote PostgreSQL URL
  - Git

--------------------------------------------------------------------------------
6. LOCAL SETUP
--------------------------------------------------------------------------------

  STEP 1 — Clone the repository
  ------------------------------
  git clone https://github.com/anju-singh6307/team-task-manager.git
  cd team-task-manager

  STEP 2 — Install backend dependencies
  --------------------------------------
  npm install

  STEP 3 — Install frontend dependencies
  ----------------------------------------
  cd frontend
  npm install
  cd ..

  STEP 4 — Configure environment variables
  -----------------------------------------
  Copy the example file and fill in your values:

    copy .env.example .env          (Windows)
    cp  .env.example .env           (Mac / Linux)

  Edit .env — see Section 7 for all variables.

  STEP 5 — Run database migrations
  ----------------------------------
  npx prisma migrate dev --name init
  npx prisma generate

  STEP 6 — Start development servers
  ------------------------------------
  Open TWO terminals:

  Terminal 1 (backend — port 5000):
    npm run dev

  Terminal 2 (frontend — port 3000):
    cd frontend
    npm run dev

  STEP 7 — Open in browser
  -------------------------
  http://localhost:3000

  Register an account → you land on the Dashboard.

--------------------------------------------------------------------------------
7. ENVIRONMENT VARIABLES
--------------------------------------------------------------------------------

  BACKEND  (.env in project root)
  --------------------------------
  DATABASE_URL        PostgreSQL connection string
                      postgresql://USER:PASS@localhost:5432/team_task_manager

  PORT                Server port (default: 5000)

  NODE_ENV            development | production

  JWT_ACCESS_SECRET   Long random string for signing access tokens
                      (generate: openssl rand -hex 32)

  JWT_REFRESH_SECRET  Different long random string for refresh tokens
                      (generate: openssl rand -hex 32)

  JWT_ACCESS_EXPIRY   Access token lifetime  (default: 15m)
  JWT_REFRESH_EXPIRY  Refresh token lifetime (default: 7d)

  CORS_ORIGIN         Allowed frontend origin
                      Local dev:  http://localhost:3000
                      Production: https://your-app.vercel.app

  FRONTEND  (frontend/.env — create from frontend/.env.example)
  ---------------------------------------------------------------
  VITE_API_URL        Backend URL for production builds only
                      Leave EMPTY for local dev (Vite proxy handles it)
                      Production: https://your-app.up.railway.app

--------------------------------------------------------------------------------
8. API ENDPOINTS
--------------------------------------------------------------------------------

  BASE URL: http://localhost:5000/api   (dev)
            https://your-app.up.railway.app/api   (prod)

  HEALTH CHECK
  GET  /health                   — server status

  AUTH
  POST /auth/register            — create account
  POST /auth/login               — returns accessToken + refreshToken
  POST /auth/refresh             — rotate refresh token, get new access token
  POST /auth/logout              — invalidate refresh token
  POST /auth/logout-all          — invalidate all sessions  [auth]
  GET  /auth/me                  — current user profile      [auth]

  USERS                          [auth required]
  GET    /users                  — list all users            [ADMIN]
  GET    /users/:id              — get user by ID
  PATCH  /users/:id              — update name / password    [self or ADMIN]
  DELETE /users/:id              — delete account            [self only]

  TEAMS                          [auth required]
  GET    /teams                  — list teams you belong to
  GET    /teams/:id              — team detail + members     [team member]
  POST   /teams                  — create team
  PATCH  /teams/:id              — update team              [OWNER or ADMIN]
  DELETE /teams/:id              — delete team              [OWNER]
  POST   /teams/:id/members      — add member               [OWNER or ADMIN]
  DELETE /teams/:id/members/:uid — remove member            [OWNER/ADMIN or self]

  PROJECTS                       [auth required]
  GET    /projects               — list projects you're part of
  GET    /projects/:id           — project detail + tasks + members
  POST   /projects               — create project (team member)
  PATCH  /projects/:id           — update project           [MANAGER or above]
  DELETE /projects/:id           — delete project           [MANAGER]
  POST   /projects/:id/members   — add project member       [MANAGER]
  DELETE /projects/:id/members/:uid — remove member

  TASKS                          [auth required]
  GET    /tasks                  — list tasks (filter: projectId, status,
                                   priority, assigneeId)
  GET    /tasks/:id              — single task
  POST   /tasks                  — create task              [project member]
  PATCH  /tasks/:id              — update task              [project member]
  DELETE /tasks/:id              — delete task              [creator/MANAGER/ADMIN]

--------------------------------------------------------------------------------
9. ROLE SYSTEM
--------------------------------------------------------------------------------

  SYSTEM ROLES  (stored on User)
  --------------------------------
  ADMIN   Full platform access; bypasses all team & project role checks
  USER    Default role for new registrations

  TEAM ROLES  (stored on TeamMember join table)
  -----------------------------------------------
  OWNER   Created team; can disband it; cannot be removed by others
  ADMIN   Manage members and projects
  MEMBER  Read/write access to team content

  PROJECT ROLES  (stored on ProjectMember join table)
  -----------------------------------------------------
  MANAGER     Create/edit/delete tasks; manage project members
  CONTRIBUTOR Create and edit tasks
  VIEWER      Read-only access

  HIERARCHY RULE
  ---------------
  System ADMIN overrides all team and project role checks.
  A user can have different team roles across teams, and different project
  roles across projects within the same team.

--------------------------------------------------------------------------------
10. DEPLOYMENT
--------------------------------------------------------------------------------

  RAILWAY  (Backend + PostgreSQL)
  ---------------------------------
  1. Go to https://railway.app → New Project → Deploy from GitHub repo
  2. Select the root of this repository
  3. Railway auto-detects Node.js and runs:
       Build : npm run build      (prisma generate + tsc)
       Start : npx prisma migrate deploy && node dist/server.js
  4. Add a PostgreSQL plugin → DATABASE_URL is injected automatically
  5. Set remaining env vars in the Variables tab (see Section 7)

  VERCEL  (Frontend)
  -------------------
  1. Go to https://vercel.com → Add New Project → Import GitHub repo
  2. Set Framework Preset to "Vite"
  3. Set Root Directory to "frontend"
  4. Add environment variable:
       VITE_API_URL = https://your-app.up.railway.app
  5. Deploy — vercel.json handles SPA routing automatically

  ORDER OF OPERATIONS
  --------------------
  a) Deploy backend to Railway first → copy the Railway URL
  b) Set VITE_API_URL in Vercel → deploy frontend → copy the Vercel URL
  c) Set CORS_ORIGIN in Railway → save (auto-redeploys)

--------------------------------------------------------------------------------
11. SCRIPTS REFERENCE
--------------------------------------------------------------------------------

  BACKEND  (run from project root)
  ----------------------------------
  npm run dev              Start dev server with hot reload
  npm run build            prisma generate + TypeScript compile
  npm run start            Start compiled production server
  npm run prisma:migrate   Run Prisma migrations (dev)
  npm run prisma:generate  Regenerate Prisma client
  npm run prisma:studio    Open Prisma Studio GUI

  FRONTEND  (run from frontend/)
  --------------------------------
  npm run dev              Start Vite dev server (http://localhost:3000)
  npm run build            TypeScript check + Vite production build
  npm run preview          Preview production build locally

--------------------------------------------------------------------------------
                        END OF README
================================================================================
