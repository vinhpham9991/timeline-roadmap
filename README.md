# Task & Timeline Manager

A modern React + TypeScript roadmap timeline app with drag, resize, milestone movement, and cloud sync.

## Tech Stack

- React 18 + TypeScript + Vite
- TailwindCSS
- Zustand
- dayjs
- Supabase (Postgres + Realtime)

## Features

- Interactive timeline (drag task, resize start/end, drag milestone)
- Filters by project / assignee / role
- Role color mapping
- Header title/subtitle editable
- Project delete from modal dropdown
- Weekend + VN holiday highlights
- Shared cloud data (multiple users see same tasks)

## 1) Local Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Run:

```bash
npm run dev
```

## 2) Supabase Database Setup

In Supabase SQL Editor, run:

```sql
create table if not exists public.tasks (
  id text primary key,
  title text not null,
  project text not null,
  assignee text not null,
  role text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

create policy "Allow anon read"
on public.tasks
for select
to anon
using (true);

create policy "Allow anon insert"
on public.tasks
for insert
to anon
with check (true);

create policy "Allow anon update"
on public.tasks
for update
to anon
using (true)
with check (true);

create policy "Allow anon delete"
on public.tasks
for delete
to anon
using (true);
```

Enable Realtime for table `tasks`:
- Supabase Dashboard -> Database -> Replication -> toggle `tasks` ON.

## 3) Deploy to GitHub

```bash
git init
git add .
git commit -m "Initial task timeline manager"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 4) Deploy to Vercel

1. Import GitHub repo in Vercel.
2. Framework: `Vite`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables in Vercel Project Settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
6. Redeploy.

## 5) Build Check

```bash
npm run build
npm run preview
```

## Notes

- Data is now stored in Supabase, not localStorage tasks.
- Anyone opening the deployed URL sees shared data from the same Supabase project.
- Current RLS policies above allow anonymous public write access. For production security, add auth and stricter policies.
