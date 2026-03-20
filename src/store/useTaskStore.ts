import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../utils/supabase';
import type { Task, TaskFilters, TaskRole } from '../types/task';

interface TaskRow {
  id: string;
  title: string;
  project: string;
  assignee: string;
  role: TaskRole;
  start_date: string;
  end_date: string;
}

interface TaskStore {
  tasks: Task[];
  selectedTaskId: string | null;
  filters: TaskFilters;
  isLoading: boolean;
  syncError: string | null;
  initialize: () => Promise<void>;
  subscribeToTasks: () => () => void;
  upsertTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteProject: (project: string) => Promise<void>;
  setSelectedTask: (id: string | null) => void;
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: TaskFilters = {
  project: '',
  assignee: '',
  role: '',
};

const FALLBACK_PROJECT_NAME = 'Uncategorized';

const SUPABASE_CONFIG_ERROR =
  'Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.';

const byStartDate = (a: Task, b: Task) =>
  new Date(a.startDate).valueOf() - new Date(b.startDate).valueOf();

const fromRow = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  project: row.project,
  assignee: row.assignee,
  role: row.role,
  startDate: row.start_date,
  endDate: row.end_date,
});

const toRow = (task: Task): TaskRow => ({
  id: task.id,
  title: task.title,
  project: task.project,
  assignee: task.assignee,
  role: task.role,
  start_date: task.startDate,
  end_date: task.endDate,
});

let channel: RealtimeChannel | null = null;

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      selectedTaskId: null,
      filters: defaultFilters,
      isLoading: false,
      syncError: null,
      initialize: async () => {
        const supabase = getSupabaseClient();
        if (!supabase) {
          set({ syncError: SUPABASE_CONFIG_ERROR, isLoading: false });
          return;
        }

        set({ isLoading: true, syncError: null });

        const { data, error } = await (supabase.from('tasks') as any).select('*').order('start_date', { ascending: true });

        if (error) {
          set({ isLoading: false, syncError: error.message });
          return;
        }

        const nextTasks = (data ?? []).map((row: unknown) => fromRow(row as TaskRow)).sort(byStartDate);
        set({ tasks: nextTasks, isLoading: false, syncError: null });
      },
      subscribeToTasks: () => {
        const supabase = getSupabaseClient();
        if (!supabase) return () => {};

        if (channel) {
          supabase.removeChannel(channel);
          channel = null;
        }

        channel = supabase
          .channel('timeline-tasks-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
            void get().initialize();
          })
          .subscribe();

        return () => {
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
        };
      },
      upsertTask: async (task) => {
        set((state) => {
          const existingIndex = state.tasks.findIndex((item) => item.id === task.id);
          if (existingIndex === -1) {
            return {
              tasks: [...state.tasks, task].sort(byStartDate),
              selectedTaskId: task.id,
            };
          }

          const nextTasks = [...state.tasks];
          nextTasks[existingIndex] = { ...task };
          return {
            tasks: nextTasks.sort(byStartDate),
            selectedTaskId: task.id,
          };
        });

        const supabase = getSupabaseClient();
        if (!supabase) {
          set({ syncError: SUPABASE_CONFIG_ERROR });
          return;
        }

        const { error } = await (supabase.from('tasks') as any).upsert(toRow(task), { onConflict: 'id' });
        if (error) {
          set({ syncError: error.message });
          void get().initialize();
          return;
        }

        set({ syncError: null });
      },
      deleteTask: async (id) => {
        set((state) => ({
          tasks: state.tasks.filter((item) => item.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        }));

        const supabase = getSupabaseClient();
        if (!supabase) {
          set({ syncError: SUPABASE_CONFIG_ERROR });
          return;
        }

        const { error } = await (supabase.from('tasks') as any).delete().eq('id', id);
        if (error) {
          set({ syncError: error.message });
          void get().initialize();
          return;
        }

        set({ syncError: null });
      },
      deleteProject: async (project) => {
        set((state) => {
          const nextTasks = state.tasks.map((task) =>
            task.project === project ? { ...task, project: FALLBACK_PROJECT_NAME } : task,
          );

          return {
            tasks: nextTasks,
            filters: {
              ...state.filters,
              project: state.filters.project === project ? '' : state.filters.project,
            },
          };
        });

        const supabase = getSupabaseClient();
        if (!supabase) {
          set({ syncError: SUPABASE_CONFIG_ERROR });
          return;
        }

        const { error } = await (supabase.from('tasks') as any)
          .update({ project: FALLBACK_PROJECT_NAME })
          .eq('project', project);

        if (error) {
          set({ syncError: error.message });
          void get().initialize();
          return;
        }

        set({ syncError: null });
      },
      setSelectedTask: (id) => set({ selectedTaskId: id }),
      setFilters: (filters) =>
        set((state) => ({
          filters: {
            ...state.filters,
            ...filters,
          },
        })),
      resetFilters: () => set({ filters: defaultFilters }),
    }),
    {
      name: 'task-timeline-store-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedTaskId: state.selectedTaskId,
        filters: state.filters,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!isSupabaseConfigured) {
          state.syncError = SUPABASE_CONFIG_ERROR;
          state.isLoading = false;
        }
      },
    },
  ),
);



