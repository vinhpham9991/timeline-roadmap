import { useEffect, useMemo, useState } from 'react';
import { TaskFiltersBar } from './components/filters/TaskFilters';
import { TaskModal } from './features/tasks/TaskModal';
import { TimelineView } from './features/timeline/TimelineView';
import { useTaskStore } from './store/useTaskStore';
import type { Task, ZoomLevel } from './types/task';

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  taskId?: string;
}

interface AppBranding {
  title: string;
  subtitle: string;
}

const BRANDING_STORAGE_KEY = 'timeline-branding-v1';

const DEFAULT_BRANDING: AppBranding = {
  title: 'Roadmap Timeline',
  subtitle: 'Jira-style roadmap with drag, resize, and timeline planning.',
};

function App() {
  const tasks = useTaskStore((state) => state.tasks);
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId);
  const filters = useTaskStore((state) => state.filters);
  const setFilters = useTaskStore((state) => state.setFilters);
  const resetFilters = useTaskStore((state) => state.resetFilters);
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask);
  const upsertTask = useTaskStore((state) => state.upsertTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const deleteProject = useTaskStore((state) => state.deleteProject);
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [modalState, setModalState] = useState<ModalState>({ open: false, mode: 'create' });
  const [branding, setBranding] = useState<AppBranding>(() => {
    try {
      const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
      if (!raw) return DEFAULT_BRANDING;
      const parsed = JSON.parse(raw) as Partial<AppBranding>;
      return {
        title: parsed.title?.trim() || DEFAULT_BRANDING.title,
        subtitle: parsed.subtitle?.trim() || DEFAULT_BRANDING.subtitle,
      };
    } catch {
      return DEFAULT_BRANDING;
    }
  });
  const [isEditingBranding, setIsEditingBranding] = useState(false);
  const [draftBranding, setDraftBranding] = useState<AppBranding>(branding);

  useEffect(() => {
    window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
  }, [branding]);

  const projects = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.project))).sort((a, b) => a.localeCompare(b)),
    [tasks],
  );

  const assignees = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.assignee))).sort((a, b) => a.localeCompare(b)),
    [tasks],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.project && task.project !== filters.project) return false;
      if (filters.assignee && task.assignee !== filters.assignee) return false;
      if (filters.role && task.role !== filters.role) return false;
      return true;
    });
  }, [filters.assignee, filters.project, filters.role, tasks]);

  const modalTask = useMemo(() => {
    if (modalState.mode !== 'edit' || !modalState.taskId) return undefined;
    return tasks.find((task) => task.id === modalState.taskId);
  }, [modalState.mode, modalState.taskId, tasks]);

  const openCreate = () => setModalState({ open: true, mode: 'create' });

  const openEdit = (task: Task) => {
    setSelectedTask(task.id);
    setModalState({ open: true, mode: 'edit', taskId: task.id });
  };

  const startBrandingEdit = () => {
    setDraftBranding(branding);
    setIsEditingBranding(true);
  };

  const cancelBrandingEdit = () => {
    setDraftBranding(branding);
    setIsEditingBranding(false);
  };

  const saveBrandingEdit = () => {
    const nextTitle = draftBranding.title.trim() || DEFAULT_BRANDING.title;
    const nextSubtitle = draftBranding.subtitle.trim() || DEFAULT_BRANDING.subtitle;
    setBranding({ title: nextTitle, subtitle: nextSubtitle });
    setIsEditingBranding(false);
  };

  return (
    <div className="flex min-h-screen flex-col p-3 sm:p-4 lg:p-6">
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 shadow-soft backdrop-blur">
        <div className="min-w-0 flex-1">
          {isEditingBranding ? (
            <div className="space-y-2">
              <input
                type="text"
                value={draftBranding.title}
                onChange={(event) => setDraftBranding((prev) => ({ ...prev, title: event.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xl font-semibold text-slate-50 outline-none transition focus:border-cyan-400"
                placeholder="App title"
              />
              <input
                type="text"
                value={draftBranding.subtitle}
                onChange={(event) => setDraftBranding((prev) => ({ ...prev, subtitle: event.target.value }))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none transition focus:border-cyan-400"
                placeholder="App subtitle"
              />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-50">{branding.title}</h1>
              <p className="text-sm text-slate-400">{branding.subtitle}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditingBranding ? (
            <>
              <button
                type="button"
                onClick={saveBrandingEdit}
                className="rounded-lg border border-emerald-400/70 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/30"
              >
                Save Header
              </button>
              <button
                type="button"
                onClick={cancelBrandingEdit}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startBrandingEdit}
              className="rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/10"
            >
              Edit Header
            </button>
          )}
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            + New Task
          </button>
        </div>
      </header>

      <div className="mb-3">
        <TaskFiltersBar
          filters={filters}
          projects={projects}
          assignees={assignees}
          onChange={setFilters}
          onReset={resetFilters}
        />
      </div>

      <main className="min-h-0 flex-1">
        <TimelineView
          tasks={filteredTasks}
          selectedTaskId={selectedTaskId}
          zoom={zoom}
          onSelectTask={setSelectedTask}
          onOpenEdit={openEdit}
          onUpsertTask={upsertTask}
          onZoomChange={setZoom}
        />
      </main>

      <TaskModal
        open={modalState.open}
        mode={modalState.mode}
        task={modalTask}
        projects={projects}
        onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        onSubmit={upsertTask}
        onDelete={deleteTask}
        onDeleteProject={deleteProject}
      />
    </div>
  );
}

export default App;

