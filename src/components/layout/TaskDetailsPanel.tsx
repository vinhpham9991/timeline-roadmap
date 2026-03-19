import type { TaskRole } from '../../types/task';
import type { Task } from '../../types/task';
import { displayDateTime } from '../../utils/date';

interface FilterItem {
  project: string;
  role: TaskRole;
  count: number;
}

interface TaskDetailsPanelProps {
  task: Task | null;
  filterItems: FilterItem[];
  activeProject: string;
  activeRole: TaskRole | '';
  onToggleFilter: (project: string, role: TaskRole) => void;
  onClearFilter: () => void;
}

const infoClass = 'rounded-xl border border-slate-700 bg-slate-900/70 p-3';

export function TaskDetailsPanel({
  task,
  filterItems,
  activeProject,
  activeRole,
  onToggleFilter,
  onClearFilter,
}: TaskDetailsPanelProps) {
  return (
    <aside className="h-full rounded-2xl border border-cyan-400/20 bg-slate-950/70 p-4 shadow-soft backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">Left Filters</h2>
        <button
          type="button"
          onClick={onClearFilter}
          className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
        >
          Clear
        </button>
      </div>

      <div className="space-y-2">
        {filterItems.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          filterItems.map((item) => {
            const isActive = item.project === activeProject && item.role === activeRole;
            return (
              <button
                key={`${item.project}-${item.role}`}
                type="button"
                onClick={() => onToggleFilter(item.project, item.role)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200'
                    : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-cyan-400/60'
                }`}
              >
                <span className="block text-sm font-medium leading-tight">{item.project}</span>
                <span className="block text-xs leading-tight text-slate-400">{item.role}</span>
                <span className="mt-1 block text-[11px] text-slate-500">{item.count} task(s)</span>
              </button>
            );
          })
        )}
      </div>

      <div className="mt-5 border-t border-slate-800 pt-4">
        <h3 className="text-sm font-semibold text-slate-200">Selected Task</h3>
        {!task ? (
          <p className="mt-2 text-sm text-slate-500">Select a task bar on the timeline to inspect details.</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <div className={infoClass}>
              <div className="text-xs uppercase tracking-wide text-slate-500">Project</div>
              <div className="mt-1 font-medium text-slate-100">{task.project}</div>
            </div>
            <div className={infoClass}>
              <div className="text-xs uppercase tracking-wide text-slate-500">Role</div>
              <div className="mt-1 font-medium text-slate-100">{task.role}</div>
            </div>
            <div className={infoClass}>
              <div className="text-xs uppercase tracking-wide text-slate-500">Start Date</div>
              <div className="mt-1 font-medium text-slate-100">{displayDateTime(task.startDate)}</div>
            </div>
            <div className={infoClass}>
              <div className="text-xs uppercase tracking-wide text-slate-500">Due Date</div>
              <div className="mt-1 font-medium text-slate-100">{displayDateTime(task.endDate)}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
