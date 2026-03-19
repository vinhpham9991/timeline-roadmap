import type { TaskFilters, TaskRole } from '../../types/task';
import { ROLES } from '../../types/task';

interface TaskFiltersProps {
  filters: TaskFilters;
  projects: string[];
  assignees: string[];
  onChange: (filters: Partial<TaskFilters>) => void;
  onReset: () => void;
}

const selectClass =
  'rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 outline-none ring-cyan-500 focus:ring-2';

export function TaskFiltersBar({
  filters,
  projects,
  assignees,
  onChange,
  onReset,
}: TaskFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-cyan-400/20 bg-slate-950/70 p-3 backdrop-blur">
      <select
        className={selectClass}
        value={filters.project}
        onChange={(event) => onChange({ project: event.target.value })}
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project} value={project}>
            {project}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.assignee}
        onChange={(event) => onChange({ assignee: event.target.value })}
      >
        <option value="">All Assignees</option>
        {assignees.map((assignee) => (
          <option key={assignee} value={assignee}>
            {assignee}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.role}
        onChange={(event) => onChange({ role: event.target.value as TaskRole | '' })}
      >
        <option value="">All Roles</option>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
        onClick={onReset}
      >
        Clear Filters
      </button>
    </div>
  );
}
