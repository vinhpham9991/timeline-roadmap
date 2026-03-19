import dayjs from 'dayjs';
import type { ZoomLevel } from '../types/task';

const DATE_TIME_FORMAT = 'YYYY-MM-DDTHH:mm';
const DISPLAY_FORMAT = 'MMM D, YYYY HH:mm';

export const toDateTimeInput = (value: string): string => dayjs(value).format(DATE_TIME_FORMAT);

export const displayDateTime = (value: string): string => dayjs(value).format(DISPLAY_FORMAT);

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const getSnapMs = (zoom: ZoomLevel): number => {
  if (zoom === 'hour') return 60 * 60 * 1000;
  if (zoom === 'day') return 24 * 60 * 60 * 1000;
  return 30 * 24 * 60 * 60 * 1000;
};

export const snapTo = (value: number, zoom: ZoomLevel): number => {
  const snapMs = getSnapMs(zoom);
  return Math.round(value / snapMs) * snapMs;
};

export const MIN_DURATION_MS = 60 * 60 * 1000;
