import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal } from '../../components/ui/Modal';
import { ROLES, type Task, type TaskRole } from '../../types/task';
import { MIN_DURATION_MS, toDateTimeInput } from '../../utils/date';

interface TaskModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  task?: Task;
  projects: string[];
  onClose: () => void;
  onSubmit: (task: Task) => void;
  onDelete?: (id: string) => void;
  onDeleteProject?: (project: string) => void;
}

interface TaskFormValues {
  title: string;
  projectChoice: string;
  customProject: string;
  assignee: string;
  role: TaskRole;
  startDate: string;
  endDate: string;
}

const blankForm = (): TaskFormValues => {
  const start = dayjs().minute(0).second(0).millisecond(0);
  const end = start.add(1, 'day');

  return {
    title: '',
    projectChoice: '__new',
    customProject: '',
    assignee: '',
    role: 'Developer',
    startDate: start.format('YYYY-MM-DDTHH:mm'),
    endDate: end.format('YYYY-MM-DDTHH:mm'),
  };
};

const fieldClass =
  'w-full rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-sm text-slate-100 outline-none ring-cyan-500 focus:ring-2';

export function TaskModal({ open, mode, task, projects, onClose, onSubmit, onDelete, onDeleteProject }: TaskModalProps) {
  const [form, setForm] = useState<TaskFormValues>(blankForm);
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<string>('');

  useEffect(() => {
    if (!open) return;

    if (!task) {
      setForm(blankForm());
      setError('');
      setNotice('');
      return;
    }

    const existingProject = projects.includes(task.project);
    setForm({
      title: task.title,
      projectChoice: existingProject ? task.project : '__new',
      customProject: existingProject ? '' : task.project,
      assignee: task.assignee,
      role: task.role,
      startDate: toDateTimeInput(task.startDate),
      endDate: toDateTimeInput(task.endDate),
    });
    setError('');
    setNotice('');
  }, [open, task, projects]);

  const modalTitle = mode === 'create' ? 'Create Task' : 'Edit Task';
  const submitLabel = mode === 'create' ? 'Create' : 'Save';

  const resolvedProject = useMemo(() => {
    if (form.projectChoice === '__new') return form.customProject.trim();
    return form.projectChoice;
  }, [form.customProject, form.projectChoice]);

  const updateField = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteProject = () => {
    if (!onDeleteProject || form.projectChoice === '__new') return;
    const projectToDelete = form.projectChoice;
    const confirmed = window.confirm(
      `Delete project "${projectToDelete}" from list?\nTasks in this project will be moved to "Uncategorized".`,
    );
    if (!confirmed) return;

    onDeleteProject(projectToDelete);
    setForm((prev) => ({ ...prev, projectChoice: '__new', customProject: '' }));
    setError('');
    setNotice(`Project "${projectToDelete}" has been removed from dropdown.`);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const startMs = dayjs(form.startDate).valueOf();
    const endMs = dayjs(form.endDate).valueOf();

    if (!form.title.trim()) {
      setError('Task name is required.');
      return;
    }

    if (!resolvedProject) {
      setError('Project is required.');
      return;
    }

    if (!form.assignee.trim()) {
      setError('Assignee is required.');
      return;
    }

    if (endMs - startMs < MIN_DURATION_MS) {
      setError('Due date must be at least 1 hour after start date.');
      return;
    }

    const nextTask: Task = {
      id: task?.id ?? crypto.randomUUID(),
      title: form.title.trim(),
      project: resolvedProject,
      assignee: form.assignee.trim(),
      role: form.role,
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
    };

    onSubmit(nextTask);
    onClose();
  };

  return (
    <Modal isOpen={open} title={modalTitle} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-300">Task Name</label>
          <input
            className={fieldClass}
            value={form.title}
            onChange={(event) => updateField('title', event.target.value)}
            placeholder="Design onboarding flow"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Project</label>
            <select
              className={fieldClass}
              value={form.projectChoice}
              onChange={(event) => {
                updateField('projectChoice', event.target.value);
                setNotice('');
              }}
            >
              <option value="__new">Create New Project</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
            {form.projectChoice !== '__new' && onDeleteProject ? (
              <button
                type="button"
                onClick={handleDeleteProject}
                className="mt-2 rounded-md border border-rose-500/50 px-2.5 py-1 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/15"
              >
                Delete This Project
              </button>
            ) : null}
          </div>

          {form.projectChoice === '__new' ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">New Project Name</label>
              <input
                className={fieldClass}
                value={form.customProject}
                onChange={(event) => updateField('customProject', event.target.value)}
                placeholder="Project Atlas"
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Assignee Name</label>
            <input
              className={fieldClass}
              value={form.assignee}
              onChange={(event) => updateField('assignee', event.target.value)}
              placeholder="Avery Kim"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Role</label>
            <select
              className={fieldClass}
              value={form.role}
              onChange={(event) => updateField('role', event.target.value as TaskRole)}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Start Date</label>
            <input
              className={fieldClass}
              type="datetime-local"
              value={form.startDate}
              onChange={(event) => updateField('startDate', event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Due Date</label>
            <input
              className={fieldClass}
              type="datetime-local"
              value={form.endDate}
              onChange={(event) => updateField('endDate', event.target.value)}
            />
          </div>
        </div>

        {notice ? <p className="rounded-lg bg-emerald-900/30 p-2 text-sm text-emerald-200">{notice}</p> : null}
        {error ? <p className="rounded-lg bg-rose-900/40 p-2 text-sm text-rose-200">{error}</p> : null}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {mode === 'edit' && task && onDelete ? (
            <button
              type="button"
              className="rounded-lg border border-rose-500/50 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/15"
              onClick={() => {
                onDelete(task.id);
                onClose();
              }}
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
