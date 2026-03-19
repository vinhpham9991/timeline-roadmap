export const ROLES = [
  'Game Designer',
  'Developer',
  'Artist',
  'Quality Control',
  'User Acquisition',
] as const;

export type TaskRole = (typeof ROLES)[number];

export type ZoomLevel = 'hour' | 'day' | 'month';

export interface Task {
  id: string;
  title: string;
  project: string;
  assignee: string;
  role: TaskRole;
  startDate: string;
  endDate: string;
}

export interface TaskFilters {
  project: string;
  assignee: string;
  role: TaskRole | '';
}

export const ROLE_COLORS: Record<TaskRole, string> = {
  'Game Designer': '#2563eb',
  Developer: '#16a34a',
  Artist: '#ec4899',
  'Quality Control': '#eab308',
  'User Acquisition': '#9333ea',
};
