import type { ZoomLevel } from '../types/task';

export interface TimelineScale {
  pxPerDay: number;
  label: string;
}

export const ZOOM_SEQUENCE: ZoomLevel[] = ['hour', 'day', 'month'];

export const SCALE_BY_ZOOM: Record<ZoomLevel, TimelineScale> = {
  hour: { pxPerDay: 120, label: 'Hour' },
  day: { pxPerDay: 34, label: 'Day' },
  month: { pxPerDay: 7.5, label: 'Month' },
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const msToPx = (ms: number, zoom: ZoomLevel): number => (ms / DAY_MS) * SCALE_BY_ZOOM[zoom].pxPerDay;

export const pxToMs = (px: number, zoom: ZoomLevel): number => (px / SCALE_BY_ZOOM[zoom].pxPerDay) * DAY_MS;

export const zoomIn = (zoom: ZoomLevel): ZoomLevel => {
  const index = ZOOM_SEQUENCE.indexOf(zoom);
  return ZOOM_SEQUENCE[Math.max(0, index - 1)];
};

export const zoomOut = (zoom: ZoomLevel): ZoomLevel => {
  const index = ZOOM_SEQUENCE.indexOf(zoom);
  return ZOOM_SEQUENCE[Math.min(ZOOM_SEQUENCE.length - 1, index + 1)];
};
