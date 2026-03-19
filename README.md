# Task & Timeline Manager

A production-ready task and timeline management web app built with **React + TypeScript + Vite**.

It includes an interactive timeline with drag-and-drop scheduling, resize handles, zoom controls, filters, role-based colors, and local persistence.

## Tech Stack

- React 18 + TypeScript
- Vite
- TailwindCSS
- Zustand (state + localStorage persistence)
- dayjs (date handling)
- dnd-kit (drag interactions)

## Features

- Create task modal with:
  - Task Name
  - Project (reuse existing or create new)
  - Assignee Name
  - Role
  - Start Date / Due Date
- Edit task modal (double-click task bar)
- Delete task from edit modal
- Left detail panel for selected task
- One-year horizontal timeline with zoom levels:
  - Hour
  - Day
  - Month
- Drag bars horizontally to shift schedule
- Resize left/right edges to change duration
- Mouse wheel zoom in/out
- Tooltip on hover with full datetime info
- Role-based color mapping
- Filters by project, assignee, role
- Current-date highlight line
- Basic conflict detection for overlapping tasks with same assignee
- Data persistence via localStorage

## Local Development

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite (usually `http://localhost:5173`).

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```text
src/
  components/
    filters/
    layout/
    ui/
  features/
    tasks/
    timeline/
  store/
  types/
  utils/
```

## Deploy to GitHub

If your terminal says `git is not recognized`, install Git first:
- Windows: https://git-scm.com/download/win
- macOS: `brew install git`
- Ubuntu/Debian: `sudo apt install git`

Then run:

```bash
git init
git add .
git commit -m "Initial task timeline manager"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Example `<your-repo-url>`:
- `https://github.com/<username>/<repo>.git`
- `git@github.com:<username>/<repo>.git`

## Deploy to Vercel

This project is Vite + React and works out of the box on Vercel.

### Option A: Deploy via Vercel Dashboard (recommended)

1. Push code to GitHub (section above).
2. Go to https://vercel.com/new
3. Import your GitHub repository.
4. Framework preset: `Vite` (auto-detected).
5. Build command: `npm run build`
6. Output directory: `dist`
7. Click **Deploy**.

### Option B: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
```

When prompted:
- Set up and deploy: `Y`
- Link to existing project: `N` (for first deploy)
- Build command: `npm run build`
- Output directory: `dist`

For production deploy after first setup:

```bash
vercel --prod
```

## Troubleshooting Deploy

- Local test before deploy:

```bash
npm install
npm run build
npm run preview
```

- If Vercel build fails, ensure Node 18+ is used.
- If GitHub import does not appear in Vercel, reconnect GitHub integration in Vercel account settings.

## Notes

- Timeline interactions are custom-rendered for better control and performance.
- No backend is required; all tasks are stored in the browser.
