import { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import type { Task, ZoomLevel } from '../../types/task';
import { clamp, MIN_DURATION_MS, snapTo } from '../../utils/date';
import { msToPx, pxToMs, SCALE_BY_ZOOM, zoomIn, zoomOut } from '../../utils/timeline';
import { TaskBar } from './TaskBar';

const DAY_MS = 24 * 60 * 60 * 1000;
const HEADER_HEIGHT = 58;

interface TimelineViewProps {
  tasks: Task[];
  selectedTaskId: string | null;
  zoom: ZoomLevel;
  onSelectTask: (id: string) => void;
  onOpenEdit: (task: Task) => void;
  onUpsertTask: (task: Task) => void;
  onZoomChange: (zoom: ZoomLevel) => void;
}

interface ResizeState {
  taskId: string;
  edge: 'start' | 'end';
  originX: number;
  originStartMs: number;
  originEndMs: number;
}

interface MoveState {
  taskId: string;
  originX: number;
  originStartMs: number;
  originEndMs: number;
}

interface MilestoneMoveState {
  project: string;
  originX: number;
  taskSnapshots: Array<{ id: string; startMs: number; endMs: number }>;
}

interface PanState {
  originX: number;
  originY: number;
  originScrollLeft: number;
  originScrollTop: number;
}

interface TimelineRange {
  startMs: number;
  endMs: number;
}

interface ProjectRow {
  kind: 'project';
  id: string;
  project: string;
  tasks: Task[];
}

interface TaskRow {
  kind: 'task';
  id: string;
  project: string;
  task: Task;
}

type RoadmapRow = ProjectRow | TaskRow;

interface Tick {
  x: number;
  label: string;
  weekdayLabel?: string;
}

const rowRangeFormat = (startMs: number, endMs: number): string =>
  `${dayjs(startMs).format('MMM D HH:mm')} - ${dayjs(endMs).format('MMM D HH:mm')}`;

const WEEKDAY_LABELS = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'] as const;

const getVietnamHolidaySet = (year: number): Set<string> => {
  // Official 2026 public break windows announced by Ministry of Home Affairs for public employees.
  if (year !== 2026) return new Set<string>();

  return new Set<string>([
    '2026-04-25',
    '2026-04-26',
    '2026-04-27',
    '2026-04-30',
    '2026-05-01',
    '2026-05-02',
    '2026-05-03',
    '2026-08-29',
    '2026-08-30',
    '2026-08-31',
    '2026-09-01',
    '2026-09-02',
  ]);
};

export function TimelineView({
  tasks,
  selectedTaskId,
  zoom,
  onSelectTask,
  onOpenEdit,
  onUpsertTask,
  onZoomChange,
}: TimelineViewProps) {
  const rightScrollRef = useRef<HTMLDivElement | null>(null);
  const leftScrollRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [moveState, setMoveState] = useState<MoveState | null>(null);
  const [milestoneMoveState, setMilestoneMoveState] = useState<MilestoneMoveState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [previewRange, setPreviewRange] = useState<Record<string, { startMs: number; endMs: number }>>({});
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});

  const [range, setRange] = useState<TimelineRange>(() => {
    const startMs = dayjs().startOf('day').subtract(2, 'month').valueOf();
    const endMs = dayjs(startMs).add(1, 'year').valueOf();
    return { startMs, endMs };
  });

  const groupedProjects = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const current = map.get(task.project) ?? [];
      current.push(task);
      map.set(task.project, current);
    });

    return [...map.entries()]
      .map(([project, projectTasks]) => ({
        project,
        tasks: [...projectTasks].sort(
          (a, b) => dayjs(a.startDate).valueOf() - dayjs(b.startDate).valueOf(),
        ),
      }))
      .sort((a, b) => a.project.localeCompare(b.project));
  }, [tasks]);

  useEffect(() => {
    if (!tasks.length) return;

    const minTaskStart = Math.min(...tasks.map((task) => dayjs(task.startDate).valueOf()));
    const maxTaskEnd = Math.max(...tasks.map((task) => dayjs(task.endDate).valueOf()));

    setRange((prev) => {
      const nextStart = minTaskStart < prev.startMs ? minTaskStart - 3 * DAY_MS : prev.startMs;
      const nextEnd = maxTaskEnd > prev.endMs ? maxTaskEnd + 3 * DAY_MS : prev.endMs;
      if (nextStart === prev.startMs && nextEnd === prev.endMs) return prev;
      return { startMs: nextStart, endMs: nextEnd };
    });
  }, [tasks]);

  const rows = useMemo(() => {
    const result: RoadmapRow[] = [];
    groupedProjects.forEach((group) => {
      result.push({ kind: 'project', id: `project-${group.project}`, project: group.project, tasks: group.tasks });
      if (!collapsedProjects[group.project]) {
        group.tasks.forEach((task) => {
          result.push({ kind: 'task', id: `task-${task.id}`, project: group.project, task });
        });
      }
    });
    return result;
  }, [collapsedProjects, groupedProjects]);

  const totalWidth = useMemo(() => msToPx(range.endMs - range.startMs, zoom), [range.endMs, range.startMs, zoom]);

  const monthTicks = useMemo(() => {
    const ticks: Tick[] = [];
    let cursor = dayjs(range.startMs).startOf('month');
    while (cursor.valueOf() <= range.endMs) {
      ticks.push({ x: msToPx(cursor.valueOf() - range.startMs, zoom), label: cursor.format('MMM YYYY') });
      cursor = cursor.add(1, 'month');
    }
    return ticks;
  }, [range.endMs, range.startMs, zoom]);

  const dayTicks = useMemo(() => {
    const ticks: Tick[] = [];
    let cursor = dayjs(range.startMs).startOf('day');
    while (cursor.valueOf() <= range.endMs) {
      ticks.push({
        x: msToPx(cursor.valueOf() - range.startMs, zoom),
        label: cursor.format('D'),
        weekdayLabel: WEEKDAY_LABELS[cursor.day()],
      });
      cursor = cursor.add(1, 'day');
    }
    return ticks;
  }, [range.endMs, range.startMs, zoom]);

  const highlightBands = useMemo(() => {
    const today = dayjs().startOf('day');
    const endOfYear = today.endOf('year');
    const holidaySet = getVietnamHolidaySet(today.year());
    const bands: Array<{ x: number; width: number }> = [];

    let cursor = dayjs(range.startMs).startOf('day');
    while (cursor.valueOf() <= range.endMs) {
      const isInWindow = cursor.isAfter(today.subtract(1, 'day')) && cursor.isBefore(endOfYear.add(1, 'day'));
      const isWeekend = cursor.day() === 0 || cursor.day() === 6;
      const isHoliday = holidaySet.has(cursor.format('YYYY-MM-DD'));

      if (isInWindow && (isWeekend || isHoliday)) {
        bands.push({
          x: msToPx(cursor.valueOf() - range.startMs, zoom),
          width: msToPx(DAY_MS, zoom),
        });
      }

      cursor = cursor.add(1, 'day');
    }

    return bands;
  }, [range.endMs, range.startMs, zoom]);

  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    for (let i = 0; i < tasks.length; i += 1) {
      for (let j = i + 1; j < tasks.length; j += 1) {
        const left = tasks[i];
        const right = tasks[j];
        if (left.assignee !== right.assignee) continue;
        const leftStart = dayjs(left.startDate).valueOf();
        const leftEnd = dayjs(left.endDate).valueOf();
        const rightStart = dayjs(right.startDate).valueOf();
        const rightEnd = dayjs(right.endDate).valueOf();
        if (leftStart < rightEnd && rightStart < leftEnd) {
          ids.add(left.id);
          ids.add(right.id);
        }
      }
    }
    return ids;
  }, [tasks]);

  useEffect(() => {
    if (!resizeState) return;
    const onPointerMove = (event: PointerEvent) => {
      const deltaMs = snapTo(pxToMs(event.clientX - resizeState.originX, zoom), zoom);
      if (resizeState.edge === 'start') {
        const nextStartMs = clamp(resizeState.originStartMs + deltaMs, range.startMs, resizeState.originEndMs - MIN_DURATION_MS);
        setPreviewRange({ [resizeState.taskId]: { startMs: nextStartMs, endMs: resizeState.originEndMs } });
        return;
      }
      const nextEndMs = clamp(resizeState.originEndMs + deltaMs, resizeState.originStartMs + MIN_DURATION_MS, range.endMs);
      setPreviewRange({ [resizeState.taskId]: { startMs: resizeState.originStartMs, endMs: nextEndMs } });
    };

    const onPointerUp = () => {
      const preview = previewRange[resizeState.taskId];
      if (preview) {
        const task = tasks.find((item) => item.id === resizeState.taskId);
        if (task) {
          onUpsertTask({ ...task, startDate: new Date(preview.startMs).toISOString(), endDate: new Date(preview.endMs).toISOString() });
        }
      }
      setResizeState(null);
      setPreviewRange({});
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [onUpsertTask, previewRange, range.endMs, range.startMs, resizeState, tasks, zoom]);

  useEffect(() => {
    if (!moveState) return;
    const onPointerMove = (event: PointerEvent) => {
      const deltaMs = snapTo(pxToMs(event.clientX - moveState.originX, zoom), zoom);
      const durationMs = moveState.originEndMs - moveState.originStartMs;
      const nextStartMs = clamp(moveState.originStartMs + deltaMs, range.startMs, range.endMs - durationMs);
      setPreviewRange({ [moveState.taskId]: { startMs: nextStartMs, endMs: nextStartMs + durationMs } });
    };

    const onPointerUp = () => {
      const preview = previewRange[moveState.taskId];
      if (preview) {
        const task = tasks.find((item) => item.id === moveState.taskId);
        if (task) {
          onUpsertTask({ ...task, startDate: new Date(preview.startMs).toISOString(), endDate: new Date(preview.endMs).toISOString() });
        }
      }
      setMoveState(null);
      setPreviewRange({});
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [moveState, onUpsertTask, previewRange, range.endMs, range.startMs, tasks, zoom]);

  useEffect(() => {
    if (!milestoneMoveState) return;

    const minStart = Math.min(...milestoneMoveState.taskSnapshots.map((t) => t.startMs));
    const maxEnd = Math.max(...milestoneMoveState.taskSnapshots.map((t) => t.endMs));

    const onPointerMove = (event: PointerEvent) => {
      const rawDeltaMs = snapTo(pxToMs(event.clientX - milestoneMoveState.originX, zoom), zoom);
      const clampedDeltaMs = clamp(rawDeltaMs, range.startMs - minStart, range.endMs - maxEnd);
      const nextPreview: Record<string, { startMs: number; endMs: number }> = {};
      milestoneMoveState.taskSnapshots.forEach((snapshot) => {
        nextPreview[snapshot.id] = { startMs: snapshot.startMs + clampedDeltaMs, endMs: snapshot.endMs + clampedDeltaMs };
      });
      setPreviewRange(nextPreview);
    };

    const onPointerUp = () => {
      milestoneMoveState.taskSnapshots.forEach((snapshot) => {
        const preview = previewRange[snapshot.id];
        if (!preview) return;
        const task = tasks.find((item) => item.id === snapshot.id);
        if (!task) return;
        onUpsertTask({ ...task, startDate: new Date(preview.startMs).toISOString(), endDate: new Date(preview.endMs).toISOString() });
      });
      setMilestoneMoveState(null);
      setPreviewRange({});
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [milestoneMoveState, onUpsertTask, previewRange, range.endMs, range.startMs, tasks, zoom]);

  useEffect(() => {
    if (!panState) return;

    const onPointerMove = (event: PointerEvent) => {
      const viewport = rightScrollRef.current;
      if (!viewport) return;
      const dx = event.clientX - panState.originX;
      const dy = event.clientY - panState.originY;
      viewport.scrollLeft = panState.originScrollLeft - dx;
      viewport.scrollTop = panState.originScrollTop - dy;
    };

    const onPointerUp = () => setPanState(null);

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [panState]);

  const onMoveStart = (task: Task, clientX: number) => {
    if (resizeState || milestoneMoveState || panState) return;
    onSelectTask(task.id);
    setMoveState({
      taskId: task.id,
      originX: clientX,
      originStartMs: dayjs(task.startDate).valueOf(),
      originEndMs: dayjs(task.endDate).valueOf(),
    });
  };

  const onResizeStart = (task: Task, edge: 'start' | 'end', clientX: number) => {
    if (moveState || milestoneMoveState || panState) return;
    onSelectTask(task.id);
    setResizeState({
      taskId: task.id,
      edge,
      originX: clientX,
      originStartMs: dayjs(task.startDate).valueOf(),
      originEndMs: dayjs(task.endDate).valueOf(),
    });
  };

  const onMilestoneMoveStart = (project: string, clientX: number) => {
    if (moveState || resizeState || milestoneMoveState || panState) return;
    const projectTasks = groupedProjects.find((group) => group.project === project)?.tasks ?? [];
    if (!projectTasks.length) return;

    setMilestoneMoveState({
      project,
      originX: clientX,
      taskSnapshots: projectTasks.map((task) => ({
        id: task.id,
        startMs: dayjs(task.startDate).valueOf(),
        endMs: dayjs(task.endDate).valueOf(),
      })),
    });
  };

  const changeZoom = (nextZoom: ZoomLevel) => {
    if (nextZoom === zoom) return;
    const viewport = rightScrollRef.current;
    if (!viewport) {
      onZoomChange(nextZoom);
      return;
    }
    const ratio = (viewport.scrollLeft + viewport.clientWidth / 2) / Math.max(viewport.scrollWidth, 1);
    onZoomChange(nextZoom);
    requestAnimationFrame(() => {
      const current = rightScrollRef.current;
      if (!current) return;
      current.scrollLeft = ratio * current.scrollWidth - current.clientWidth / 2;
    });
  };

  const toggleProject = (project: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [project]: !prev[project] }));
  };

  const nowX = msToPx(dayjs().valueOf() - range.startMs, zoom);
  const nowVisible = dayjs().valueOf() >= range.startMs && dayjs().valueOf() <= range.endMs;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-cyan-400/20 bg-slate-950/70 shadow-soft backdrop-blur">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="text-sm font-semibold text-slate-100">Roadmap</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => changeZoom(zoomIn(zoom))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300">Zoom In</button>
          <span className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-sm font-medium text-cyan-200">{SCALE_BY_ZOOM[zoom].label}</span>
          <button type="button" onClick={() => changeZoom(zoomOut(zoom))} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300">Zoom Out</button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div
          ref={leftScrollRef}
          className="w-[330px] shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-950/70"
          onScroll={(event) => {
            if (syncingRef.current) return;
            const right = rightScrollRef.current;
            if (!right) return;
            syncingRef.current = true;
            right.scrollTop = event.currentTarget.scrollTop;
            requestAnimationFrame(() => {
              syncingRef.current = false;
            });
          }}
        >
          <div style={{ height: `${HEADER_HEIGHT}px` }} className="border-b border-slate-800" />
          {rows.map((row) => {
            if (row.kind === 'project') {
              const isCollapsed = Boolean(collapsedProjects[row.project]);
              return (
                <div key={row.id} className="flex h-10 items-center gap-2 border-b border-slate-900 px-3 text-sm text-slate-100">
                  <button type="button" onClick={() => toggleProject(row.project)} className="h-5 w-5 rounded border border-slate-700 text-xs text-slate-300">{isCollapsed ? '+' : '-'}</button>
                  <span className="truncate font-semibold">{row.project}</span>
                </div>
              );
            }

            const preview = previewRange[row.task.id];
            const startMs = preview?.startMs ?? dayjs(row.task.startDate).valueOf();
            const endMs = preview?.endMs ?? dayjs(row.task.endDate).valueOf();

            return (
              <div key={row.id} className={`flex h-14 items-center border-b border-slate-900 px-3 ${selectedTaskId === row.task.id ? 'bg-slate-900/80' : 'bg-transparent'}`} onClick={() => onSelectTask(row.task.id)}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[11px] text-slate-400"><span className="truncate">{row.task.assignee}</span><span className="text-slate-600">·</span><span className="truncate text-cyan-300/85">{row.task.role}</span></div>
                  <div className="truncate text-sm font-medium text-slate-200">{row.task.title}</div>
                  <div className="truncate text-[11px] text-slate-500">{rowRangeFormat(startMs, endMs)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          ref={rightScrollRef}
          className={`min-w-0 flex-1 overflow-auto ${panState ? 'cursor-grabbing' : 'cursor-grab'}`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            if (moveState || resizeState || milestoneMoveState) return;
            const target = event.target as HTMLElement;
            if (target.closest('[data-no-pan="true"]')) return;
            const viewport = rightScrollRef.current;
            if (!viewport) return;
            event.preventDefault();
            setPanState({
              originX: event.clientX,
              originY: event.clientY,
              originScrollLeft: viewport.scrollLeft,
              originScrollTop: viewport.scrollTop,
            });
          }}
          onScroll={(event) => {
            if (syncingRef.current) return;
            const left = leftScrollRef.current;
            if (!left) return;
            syncingRef.current = true;
            left.scrollTop = event.currentTarget.scrollTop;
            requestAnimationFrame(() => {
              syncingRef.current = false;
            });
          }}
        >
          <div className="relative" style={{ width: `${totalWidth}px` }}>
            <div className="sticky top-0 z-20 h-[64px] border-b border-slate-800 bg-slate-950/92 backdrop-blur">
              {monthTicks.map((tick) => (
                <div key={`month-${tick.x}`} className="absolute top-0" style={{ left: `${tick.x}px` }}>
                  <span className="text-[11px] font-semibold tracking-wide text-slate-500">{tick.label}</span>
                </div>
              ))}
              <div className="absolute bottom-1 left-0 right-0 h-8">
                {dayTicks.map((tick) => (
                  <div key={`day-${tick.x}`} className="absolute flex flex-col items-center" style={{ left: `${tick.x}px` }}>
                    <span className="text-[9px] font-medium text-slate-500">{tick.weekdayLabel}</span>
                    <span className="text-[10px] text-slate-400">{tick.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {rows.map((row, index) => {
              const isProjectRow = row.kind === 'project';
              const rowHeight = isProjectRow ? 40 : 56;
              const rowBg = index % 2 === 0 ? 'bg-slate-950/45' : 'bg-slate-900/35';

              return (
                <div key={`line-${row.id}`} className={`relative border-b border-slate-900 ${rowBg}`} style={{ height: `${rowHeight}px` }}>
                  {highlightBands.map((band) => (
                    <span
                      key={`${row.id}-highlight-${band.x}`}
                      className="pointer-events-none absolute inset-y-0 bg-rose-500/50"
                      style={{ left: `${band.x}px`, width: `${band.width}px` }}
                    />
                  ))}

                  {dayTicks.map((tick) => (
                    <span key={`${row.id}-${tick.x}`} className={`absolute inset-y-0 w-px ${tick.label === '1' ? 'bg-slate-700' : 'bg-slate-800'}`} style={{ left: `${tick.x}px` }} />
                  ))}

                  {isProjectRow ? (
                    (() => {
                      const projectRow = row as ProjectRow;
                      if (!projectRow.tasks.length) return null;
                      const taskRanges = projectRow.tasks.map((task) => {
                        const preview = previewRange[task.id];
                        return {
                          startMs: preview?.startMs ?? dayjs(task.startDate).valueOf(),
                          endMs: preview?.endMs ?? dayjs(task.endDate).valueOf(),
                        };
                      });
                      const projectStart = Math.min(...taskRanges.map((r) => r.startMs));
                      const projectEnd = Math.max(...taskRanges.map((r) => r.endMs));
                      const isMovingMilestone = milestoneMoveState?.project === projectRow.project;
                      return (
                        <button
                          type="button"
                          data-no-pan="true"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            onMilestoneMoveStart(projectRow.project, event.clientX);
                          }}
                          className={`absolute top-1 h-8 rounded-md bg-emerald-500/70 px-2 text-left text-xs font-semibold text-white ${isMovingMilestone ? 'cursor-grabbing ring-2 ring-emerald-200/60' : 'cursor-grab'}`}
                          style={{ left: `${msToPx(projectStart - range.startMs, zoom)}px`, width: `${Math.max(msToPx(projectEnd - projectStart, zoom), 38)}px` }}
                          title="Drag milestone to move all tasks in this project"
                        >
                          <div className="mt-2 truncate">{projectRow.project}</div>
                        </button>
                      );
                    })()
                  ) : (
                    (() => {
                      const taskRow = row as TaskRow;
                      const fallbackStartMs = dayjs(taskRow.task.startDate).valueOf();
                      const fallbackEndMs = dayjs(taskRow.task.endDate).valueOf();
                      const preview = previewRange[taskRow.task.id];
                      const startMs = preview?.startMs ?? fallbackStartMs;
                      const endMs = preview?.endMs ?? fallbackEndMs;
                      return (
                        <TaskBar
                          task={taskRow.task}
                          zoom={zoom}
                          left={msToPx(startMs - range.startMs, zoom)}
                          width={msToPx(endMs - startMs, zoom)}
                          isSelected={selectedTaskId === taskRow.task.id}
                          hasConflict={conflictIds.has(taskRow.task.id)}
                          isMoving={moveState?.taskId === taskRow.task.id}
                          isResizing={resizeState?.taskId === taskRow.task.id}
                          liveStartDate={new Date(startMs).toISOString()}
                          liveEndDate={new Date(endMs).toISOString()}
                          onSelect={onSelectTask}
                          onDoubleClick={onOpenEdit}
                          onMoveStart={onMoveStart}
                          onResizeStart={onResizeStart}
                        />
                      );
                    })()
                  )}
                </div>
              );
            })}

            {nowVisible ? (
              <div className="pointer-events-none absolute bottom-0 top-0 z-[120] border-l-2 border-amber-400/90" style={{ left: `${nowX}px` }}>
                <span className="absolute -left-5 top-1 z-[121] rounded bg-amber-400 px-1.5 text-[10px] font-semibold text-slate-900 shadow-lg shadow-amber-500/40">Today</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}





