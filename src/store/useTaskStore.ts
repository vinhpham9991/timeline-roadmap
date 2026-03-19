import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Task, TaskFilters } from '../types/task';

interface TaskStore {
  tasks: Task[];
  selectedTaskId: string | null;
  filters: TaskFilters;
  upsertTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  deleteProject: (project: string) => void;
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

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      selectedTaskId: null,
      filters: defaultFilters,
      upsertTask: (task) =>
        set((state) => {
          const existingIndex = state.tasks.findIndex((item) => item.id === task.id);
          if (existingIndex === -1) {
            return {
              tasks: [...state.tasks, task],
              selectedTaskId: task.id,
            };
          }

          const nextTasks = [...state.tasks];
          nextTasks[existingIndex] = task;
          return {
            tasks: nextTasks,
            selectedTaskId: task.id,
          };
        }),
      deleteTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((item) => item.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        })),
      deleteProject: (project) =>
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
        }),
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
      name: 'task-timeline-store-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tasks: state.tasks,
        selectedTaskId: state.selectedTaskId,
        filters: state.filters,
      }),
    },
  ),
);
