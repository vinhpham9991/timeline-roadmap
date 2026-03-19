import dayjs from 'dayjs';
import type { Task, ZoomLevel } from '../../types/task';
import { ROLE_COLORS } from '../../types/task';
import { displayDateTime } from '../../utils/date';

interface TaskBarProps {
  task: Task;
  left: number;
  width: number;
  zoom: ZoomLevel;
  isSelected: boolean;
  hasConflict: boolean;
  isMoving?: boolean;
  isResizing?: boolean;
  liveStartDate?: string;
  liveEndDate?: string;
  onSelect: (id: string) => void;
  onDoubleClick: (task: Task) => void;
  onMoveStart: (task: Task, clientX: number) => void;
  onResizeStart: (task: Task, edge: 'start' | 'end', clientX: number) => void;
}

const barRangeFormat = (start: string, end: string): string =>
  `${dayjs(start).format('MMM D HH:mm')} - ${dayjs(end).format('MMM D HH:mm')}`;

export function TaskBar({
  task,
  left,
  width,
  zoom,
  isSelected,
  hasConflict,
  isMoving = false,
  isResizing = false,
  liveStartDate,
  liveEndDate,
  onSelect,
  onDoubleClick,
  onMoveStart,
  onResizeStart,
}: TaskBarProps) {
  const style = {
    left: `${left}px`,
    width: `${Math.max(width, 24)}px`,
    backgroundColor: ROLE_COLORS[task.role],
    zIndex: isMoving ? 30 : isSelected ? 20 : 10,
    opacity: isMoving ? 0.92 : 1,
  } as const;

  const displayStart = liveStartDate ?? task.startDate;
  const displayEnd = liveEndDate ?? task.endDate;

  return (
    <div
      data-no-pan="true"
      style={style}
      className={`group absolute top-1 h-10 rounded-md text-slate-100 shadow transition-shadow ${
        isSelected ? 'ring-2 ring-slate-900/70' : ''
      } ${hasConflict ? 'ring-2 ring-rose-500/80' : ''}`}
      onClick={() => onSelect(task.id)}
      onDoubleClick={() => onDoubleClick(task)}
      title={`${task.title}\n${displayDateTime(displayStart)} - ${displayDateTime(displayEnd)}`}
    >
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizeStart(task, 'start', event.clientX);
        }}
        className="absolute left-0 top-0 z-20 h-full w-3 cursor-ew-resize rounded-l-md bg-slate-950/55"
        aria-label="Resize start"
      />

      <div
        className="absolute inset-y-0 left-3 right-3 flex cursor-grab select-none flex-col justify-center px-2 active:cursor-grabbing"
        style={{ touchAction: 'none' }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onMoveStart(task, event.clientX);
        }}
      >
        <span className="truncate text-[11px] font-semibold leading-tight">{task.title}</span>
        <span className="truncate text-[10px] leading-tight text-slate-100/90">{barRangeFormat(displayStart, displayEnd)}</span>
      </div>

      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation();
          onResizeStart(task, 'end', event.clientX);
        }}
        className="absolute right-0 top-0 z-20 h-full w-3 cursor-ew-resize rounded-r-md bg-slate-950/55"
        aria-label="Resize end"
      />

      <div className="pointer-events-none absolute -top-14 left-1/2 hidden w-max -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 text-[11px] text-slate-100 group-hover:block">
        <div>{task.title}</div>
        <div className="text-slate-200">{displayDateTime(displayStart)}</div>
        <div className="text-slate-200">{displayDateTime(displayEnd)}</div>
      </div>

      {isResizing ? (
        <div className="pointer-events-none absolute -top-20 left-1/2 z-30 w-max -translate-x-1/2 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 shadow-lg">
          <div className="font-medium">Live Resize</div>
          <div className="text-slate-200">Start: {displayDateTime(displayStart)}</div>
          <div className="text-slate-200">End: {displayDateTime(displayEnd)}</div>
        </div>
      ) : null}

      {hasConflict ? <span className="absolute -right-1 -top-1 inline-block h-2.5 w-2.5 rounded-full bg-rose-500" /> : null}

      {zoom === 'month' ? <span className="absolute bottom-0 left-0 h-px w-full bg-white/40" /> : null}
    </div>
  );
}
