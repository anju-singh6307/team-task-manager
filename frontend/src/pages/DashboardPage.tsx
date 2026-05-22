import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
} from 'lucide-react';
import { tasksApi } from '../api/tasks';
import { useAuth } from '../context/AuthContext';
import type { Task, TaskStats } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; dot: string; badge: string }> = {
  TODO:        { label: 'To Do',       dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700' },
  IN_REVIEW:   { label: 'In Review',   dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  DONE:        { label: 'Done',        dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelled',   dot: 'bg-red-400',   badge: 'bg-red-100 text-red-600' },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  LOW:    { label: 'Low',    badge: 'bg-gray-100 text-gray-500' },
  MEDIUM: { label: 'Medium', badge: 'bg-blue-100 text-blue-600' },
  HIGH:   { label: 'High',   badge: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgent', badge: 'bg-red-100 text-red-600' },
};

// ── Stat cards ────────────────────────────────────────────────────────────────

function TotalCard({ value, isLoading }: { value: number; isLoading: boolean }) {
  if (isLoading) return <StatSkeleton />;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">Total Tasks</p>
          <p className="mt-1.5 text-4xl font-bold tabular-nums text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-400">Assigned to you</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
          <CheckSquare className="h-5 w-5 text-indigo-600" />
        </div>
      </div>
    </div>
  );
}

function CompletedCard({
  value,
  total,
  isLoading,
}: {
  value: number;
  total: number;
  isLoading: boolean;
}) {
  if (isLoading) return <StatSkeleton />;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">Completed</p>
          <p className="mt-1.5 text-4xl font-bold tabular-nums text-green-600">{value}</p>
          <p className="mt-1 text-xs text-gray-400">{pct}% of all tasks done</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Progress</span>
          <span className="text-xs font-medium text-green-600">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function OverdueCard({ value, isLoading }: { value: number; isLoading: boolean }) {
  if (isLoading) return <StatSkeleton />;
  const hasOverdue = value > 0;
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        hasOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${hasOverdue ? 'text-red-600' : 'text-gray-500'}`}>
            Overdue
          </p>
          <p
            className={`mt-1.5 text-4xl font-bold tabular-nums ${
              hasOverdue ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {value}
          </p>
          <p className={`mt-1 text-xs ${hasOverdue ? 'text-red-400' : 'text-gray-400'}`}>
            {hasOverdue ? 'Need immediate attention' : 'All tasks on track'}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            hasOverdue ? 'bg-red-100' : 'bg-gray-100'
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 ${hasOverdue ? 'text-red-600' : 'text-gray-400'}`}
          />
        </div>
      </div>
      {hasOverdue && (
        <Link
          to="/tasks?status=overdue"
          className="mt-4 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
        >
          View overdue tasks <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2.5">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-9 w-14 rounded bg-gray-200" />
          <div className="h-3 w-28 rounded bg-gray-200" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-gray-200" />
      </div>
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: Task }) {
  const status = STATUS_META[task.status];
  const priority = PRIORITY_META[task.priority];
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'DONE' &&
    task.status !== 'CANCELLED';

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50">
      <span className={`h-2 w-2 shrink-0 rounded-full ${status?.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
          {task.project && <span className="truncate">{task.project.name}</span>}
          {task.dueDate && (
            <>
              <span className="text-gray-300">·</span>
              <span
                className={`flex items-center gap-0.5 ${
                  isOverdue ? 'font-medium text-red-500' : ''
                }`}
              >
                <Calendar className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priority?.badge}`}>
          {priority?.label}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status?.badge}`}>
          {status?.label}
        </span>
      </div>
    </div>
  );
}

function OverdueRow({ task }: { task: Task }) {
  const daysOverdue = task.dueDate
    ? Math.floor((Date.now() - new Date(task.dueDate).getTime()) / 86_400_000)
    : 0;
  const priority = PRIORITY_META[task.priority];

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-red-50/60">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
        <p className="mt-0.5 text-xs text-red-500">
          {daysOverdue === 0
            ? 'Due today'
            : daysOverdue === 1
            ? '1 day overdue'
            : `${daysOverdue} days overdue`}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${priority?.badge}`}>
        {priority?.label}
      </span>
    </div>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-5 py-3.5">
          <div className="h-2 w-2 shrink-0 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-44 rounded bg-gray-200" />
            <div className="h-3 w-28 rounded bg-gray-200" />
          </div>
          <div className="h-5 w-14 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats]         = useState<TaskStats | null>(null);
  const [recent, setRecent]       = useState<Task[]>([]);
  const [overdueList, setOverdueList] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function load() {
      try {
        // Parallel: server-side stats + recent task list
        const [statsRes, tasksRes] = await Promise.all([
          tasksApi.stats({ assigneeId: user!.id }),
          tasksApi.list({ assigneeId: user!.id }),
        ]);

        if (cancelled) return;

        const allTasks = tasksRes.data.data?.tasks ?? [];
        const now      = new Date();

        const overdue = allTasks
          .filter(
            (t) =>
              t.dueDate &&
              new Date(t.dueDate) < now &&
              t.status !== 'DONE' &&
              t.status !== 'CANCELLED',
          )
          .sort(
            (a, b) =>
              new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
          );

        setStats(statsRes.data.data ?? null);
        setRecent(allTasks.slice(0, 5));
        setOverdueList(overdue.slice(0, 5));
      } catch {
        /* silently fail — empty state shown */
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const total     = Object.values(stats?.byStatus ?? {}).reduce((s, n) => s + n, 0);
  const completed = stats?.byStatus?.DONE       ?? 0;
  const overdue   = stats?.overdue              ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s your task overview for today.
        </p>
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TotalCard     value={total}     isLoading={isLoading} />
        <CompletedCard value={completed} total={total} isLoading={isLoading} />
        <OverdueCard   value={overdue}   isLoading={isLoading} />
      </div>

      {/* ── Bottom two-column layout ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Recent tasks */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900">Recent Tasks</h3>
            </div>
            <Link
              to="/tasks"
              className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {isLoading ? (
            <ListSkeleton rows={5} />
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-9 w-9 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No tasks assigned yet</p>
              <p className="mt-1 text-xs text-gray-400">
                Tasks assigned to you will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recent.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </div>

        {/* Overdue tasks */}
        <div
          className={`overflow-hidden rounded-xl border shadow-sm ${
            overdueList.length > 0
              ? 'border-red-200 bg-white'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div
            className={`flex items-center justify-between border-b px-5 py-4 ${
              overdueList.length > 0 ? 'border-red-100 bg-red-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle
                className={`h-4 w-4 ${
                  overdueList.length > 0 ? 'text-red-500' : 'text-gray-400'
                }`}
              />
              <h3
                className={`text-sm font-semibold ${
                  overdueList.length > 0 ? 'text-red-700' : 'text-gray-900'
                }`}
              >
                Overdue Tasks
                {overdueList.length > 0 && (
                  <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                    {overdue}
                  </span>
                )}
              </h3>
            </div>
            {overdueList.length > 0 && (
              <Link
                to="/tasks"
                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <ListSkeleton rows={4} />
          ) : overdueList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="mb-3 h-9 w-9 text-green-200" />
              <p className="text-sm font-medium text-gray-500">No overdue tasks</p>
              <p className="mt-1 text-xs text-gray-400">You&apos;re all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {overdueList.map((t) => <OverdueRow key={t.id} task={t} />)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
