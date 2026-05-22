import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import {
  Plus,
  CheckSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  Calendar,
  X,
} from 'lucide-react';
import { tasksApi, type CreateTaskPayload, type UpdateTaskPayload } from '../api/tasks';
import { projectsApi } from '../api/projects';
import { useAuth } from '../context/AuthContext';
import type { Task, TaskStatus, TaskPriority, ProjectWithMeta, ProjectMember } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_OPTS: { value: TaskStatus | ''; label: string }[] = [
  { value: '',            label: 'All Statuses' },
  { value: 'TODO',        label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW',   label: 'In Review' },
  { value: 'DONE',        label: 'Done' },
  { value: 'CANCELLED',   label: 'Cancelled' },
];

const PRIORITY_OPTS: { value: TaskPriority | ''; label: string }[] = [
  { value: '',       label: 'All Priorities' },
  { value: 'LOW',    label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH',   label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUS_META: Record<TaskStatus, { label: string; dot: string; badge: string }> = {
  TODO:        { label: 'To Do',       dot: 'bg-gray-400',  badge: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-blue-500',  badge: 'bg-blue-100 text-blue-700' },
  IN_REVIEW:   { label: 'In Review',   dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
  DONE:        { label: 'Done',        dot: 'bg-green-500', badge: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelled',   dot: 'bg-red-400',   badge: 'bg-red-100 text-red-600' },
};

const PRIORITY_META: Record<TaskPriority, { label: string; badge: string }> = {
  LOW:    { label: 'Low',    badge: 'bg-gray-100 text-gray-500' },
  MEDIUM: { label: 'Medium', badge: 'bg-blue-100 text-blue-600' },
  HIGH:   { label: 'High',   badge: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgent', badge: 'bg-red-100 text-red-600' },
};

// ── Task form values ──────────────────────────────────────────────────────────

interface TaskFormValues {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── Row options menu ──────────────────────────────────────────────────────────

function TaskMenu({
  task,
  open,
  onToggle,
  onEdit,
  onAssign,
  onUnassign,
  onDelete,
}: {
  task: Task;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onUnassign: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    if (open) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open, onToggle]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 transition group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
          <button onClick={() => { onToggle(); onEdit(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
            <Pencil className="h-3.5 w-3.5" /> Edit task
          </button>
          {task.assigneeId ? (
            <button onClick={() => { onToggle(); onUnassign(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              <UserMinus className="h-3.5 w-3.5" /> Unassign
            </button>
          ) : (
            <button onClick={() => { onToggle(); onAssign(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
              <UserPlus className="h-3.5 w-3.5" /> Assign
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => { onToggle(); onDelete(); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Task form modal ───────────────────────────────────────────────────────────

function TaskFormModal({
  mode,
  projects,
  defaultValues,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  projects: ProjectWithMeta[];
  defaultValues?: Partial<TaskFormValues & { id: string }>;
  onClose: () => void;
  onSaved: (task: Task) => void;
}) {
  const { user } = useAuth();
  const [serverError, setServerError] = useState('');
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    defaultValues: {
      status: 'TODO',
      priority: 'MEDIUM',
      ...defaultValues,
    },
  });

  const selectedProject = watch('projectId');

  // Fetch project members whenever the selected project changes
  useEffect(() => {
    if (!selectedProject) { setMembers([]); return; }
    projectsApi.getById(selectedProject).then((res) => {
      setMembers(res.data.data?.project?.members ?? []);
    }).catch(() => setMembers([]));
  }, [selectedProject]);

  async function onSubmit(values: TaskFormValues) {
    setServerError('');
    try {
      let task: Task;
      if (mode === 'create') {
        const payload: CreateTaskPayload = {
          title:       values.title,
          projectId:   values.projectId,
          description: values.description || undefined,
          status:      values.status,
          priority:    values.priority,
          dueDate:     values.dueDate || undefined,
          assigneeId:  values.assigneeId || undefined,
        };
        const res = await tasksApi.create(payload);
        task = res.data.data!.task;
      } else {
        const payload: UpdateTaskPayload = {
          title:       values.title,
          description: values.description || undefined,
          status:      values.status,
          priority:    values.priority,
          dueDate:     values.dueDate || null,
          assigneeId:  values.assigneeId || null,
        };
        const res = await tasksApi.update(defaultValues!.id!, payload);
        task = res.data.data!.task;
      }
      onSaved(task);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setServerError(msg ?? 'Something went wrong.');
    }
  }

  const inputCls = (err?: string) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
      err ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white focus:border-indigo-500'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? 'New Task' : 'Edit Task'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-4 px-6 py-5">
            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Title *</label>
              <input
                type="text"
                placeholder="What needs to be done?"
                {...register('title', { required: 'Title is required', maxLength: { value: 200, message: 'Max 200 characters' } })}
                className={inputCls(errors.title?.message)}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                rows={2}
                placeholder="Add more context..."
                {...register('description')}
                className={`${inputCls()} resize-none`}
              />
            </div>

            {/* Project — create only */}
            {mode === 'create' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Project *</label>
                <select
                  {...register('projectId', { required: 'Select a project' })}
                  className={inputCls(errors.projectId?.message)}
                >
                  <option value="">Select a project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {errors.projectId && <p className="mt-1 text-xs text-red-600">{errors.projectId.message}</p>}
              </div>
            )}

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
                <select {...register('status')} className={inputCls()}>
                  {STATUS_OPTS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Priority</label>
                <select {...register('priority')} className={inputCls()}>
                  {PRIORITY_OPTS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due date + Assignee */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Due date</label>
                <input type="date" {...register('dueDate')} className={inputCls()} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Assignee</label>
                <select {...register('assigneeId')} className={inputCls()} disabled={!selectedProject}>
                  <option value="">Unassigned</option>
                  {/* Always include current user as quick option */}
                  {user && (
                    <option value={user.id}>Me ({user.name})</option>
                  )}
                  {members
                    .filter((m) => m.userId !== user?.id)
                    .map((m) => (
                      <option key={m.userId} value={m.userId}>{m.user.name}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Assign modal ──────────────────────────────────────────────────────────────

function AssignModal({
  task,
  onClose,
  onAssigned,
}: {
  task: Task;
  onClose: () => void;
  onAssigned: (task: Task) => void;
}) {
  const { user } = useAuth();
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    projectsApi.getById(task.projectId)
      .then((res) => setMembers(res.data.data?.project?.members ?? []))
      .finally(() => setLoading(false));
  }, [task.projectId]);

  async function assign(memberId: string) {
    setAssigning(memberId);
    try {
      const res = await tasksApi.assign(task.id, memberId);
      onAssigned(res.data.data!.task);
    } finally {
      setAssigning(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Assign Task</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-3">
          <p className="mb-3 text-xs text-gray-500 truncate">
            &ldquo;{task.title}&rdquo;
          </p>
          {loading ? (
            <div className="flex justify-center py-6">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No project members found</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((m) => {
                const isCurrentAssignee = task.assigneeId === m.userId;
                return (
                  <li key={m.userId}>
                    <button
                      onClick={() => assign(m.userId)}
                      disabled={!!assigning}
                      className={`flex w-full items-center gap-3 px-3 py-3 rounded-lg text-left transition hover:bg-gray-50 ${
                        isCurrentAssignee ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                        {initials(m.user.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {m.user.name}
                          {m.userId === user?.id && ' (me)'}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{m.role.toLowerCase()}</p>
                      </div>
                      {isCurrentAssignee && (
                        <span className="text-xs font-medium text-indigo-600">Assigned</span>
                      )}
                      {assigning === m.userId && (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-5 py-4">
      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-56 rounded bg-gray-200" />
        <div className="h-3 w-36 rounded bg-gray-200" />
      </div>
      <div className="h-5 w-14 rounded-full bg-gray-200" />
      <div className="h-5 w-20 rounded-full bg-gray-200" />
      <div className="h-6 w-6 rounded-full bg-gray-200" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create' }
  | { type: 'edit';   task: Task }
  | { type: 'assign'; task: Task }
  | { type: 'delete'; task: Task }
  | null;

export function TasksPage() {
  const { user } = useAuth();
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal]  = useState<ModalState>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [filterStatus,    setFilterStatus]    = useState('');
  const [filterPriority,  setFilterPriority]  = useState('');
  const [filterProjectId, setFilterProjectId] = useState('');
  const [showMine,        setShowMine]        = useState(false);

  useEffect(() => {
    projectsApi.list()
      .then((r) => setProjects(r.data.data?.projects ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    tasksApi.list({
      status:      filterStatus    || undefined,
      priority:    filterPriority  || undefined,
      projectId:   filterProjectId || undefined,
      assigneeId:  showMine ? user?.id : undefined,
    }).then((r) => {
      if (!cancelled) { setTasks(r.data.data?.tasks ?? []); setIsLoading(false); }
    }).catch(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [filterStatus, filterPriority, filterProjectId, showMine, user?.id]);

  function handleSaved(task: Task) {
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      return idx >= 0 ? prev.map((t) => (t.id === task.id ? task : t)) : [task, ...prev];
    });
    setModal(null);
  }

  async function handleUnassign(task: Task) {
    try {
      const res = await tasksApi.assign(task.id, null);
      handleSaved(res.data.data!.task);
    } catch { /* ignore */ }
  }

  async function handleDelete(task: Task) {
    try {
      await tasksApi.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch { /* ignore */ }
    setModal(null);
  }

  const activeFilters =
    [filterStatus, filterPriority, filterProjectId, showMine ? 'mine' : ''].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Tasks</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isLoading ? '…' : `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`}
            {activeFilters > 0 && ` · ${activeFilters} filter${activeFilters > 1 ? 's' : ''} active`}
          </p>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          disabled={projects.length === 0}
          title={projects.length === 0 ? 'Join a project first' : undefined}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {PRIORITY_OPTS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={filterProjectId}
          onChange={(e) => setFilterProjectId(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <button
          onClick={() => setShowMine((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
            showMine
              ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          Assigned to me
        </button>

        {activeFilters > 0 && (
          <button
            onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterProjectId(''); setShowMine(false); }}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="mb-3 h-10 w-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">
              {activeFilters > 0 ? 'No tasks match your filters' : 'No tasks yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {activeFilters > 0
                ? 'Try adjusting or clearing your filters'
                : 'Create a task to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden grid-cols-[1rem_1fr_auto_auto_auto_auto_2rem] items-center gap-4 border-b border-gray-200 px-5 py-2.5 sm:grid">
              <div />
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Task</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Priority</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Assignee</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Due</p>
              <div />
            </div>

            <div className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const sm = STATUS_META[task.status];
                const pm = PRIORITY_META[task.priority];
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'DONE' &&
                  task.status !== 'CANCELLED';

                return (
                  <div
                    key={task.id}
                    className="group grid grid-cols-[1rem_1fr] items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 sm:grid-cols-[1rem_1fr_auto_auto_auto_auto_2rem]"
                  >
                    {/* Status dot */}
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sm.dot}`} />

                    {/* Title + meta */}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                        {task.project && <span className="truncate">{task.project.name}</span>}
                        {/* Mobile badges */}
                        <span className={`inline-flex sm:hidden rounded-full px-1.5 py-0.5 font-medium ${pm.badge}`}>
                          {pm.label}
                        </span>
                        <span className={`inline-flex sm:hidden rounded-full px-1.5 py-0.5 font-medium ${sm.badge}`}>
                          {sm.label}
                        </span>
                      </div>
                    </div>

                    {/* Priority badge — desktop */}
                    <span className={`hidden sm:inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${pm.badge}`}>
                      {pm.label}
                    </span>

                    {/* Status badge — desktop */}
                    <span className={`hidden sm:inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sm.badge}`}>
                      {sm.label}
                    </span>

                    {/* Assignee */}
                    <div className="hidden sm:flex h-7 w-7 items-center justify-center">
                      {task.assignee ? (
                        <div
                          title={task.assignee.name}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white"
                        >
                          {initials(task.assignee.name)}
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-300">
                          <span className="text-xs">—</span>
                        </div>
                      )}
                    </div>

                    {/* Due date */}
                    <div className="hidden sm:flex items-center gap-1 text-xs whitespace-nowrap">
                      {task.dueDate ? (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'font-medium text-red-600' : 'text-gray-400'}`}>
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>

                    {/* Options menu */}
                    <TaskMenu
                      task={task}
                      open={menuId === task.id}
                      onToggle={() => setMenuId((id) => (id === task.id ? null : task.id))}
                      onEdit={() => setModal({ type: 'edit', task })}
                      onAssign={() => setModal({ type: 'assign', task })}
                      onUnassign={() => handleUnassign(task)}
                      onDelete={() => setModal({ type: 'delete', task })}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'create' && (
        <TaskFormModal
          mode="create"
          projects={projects}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {modal?.type === 'edit' && (
        <TaskFormModal
          mode="edit"
          projects={projects}
          defaultValues={{
            id:          modal.task.id,
            title:       modal.task.title,
            description: modal.task.description ?? '',
            projectId:   modal.task.projectId,
            status:      modal.task.status,
            priority:    modal.task.priority,
            dueDate:     modal.task.dueDate ? modal.task.dueDate.split('T')[0] : '',
            assigneeId:  modal.task.assigneeId ?? '',
          }}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {modal?.type === 'assign' && (
        <AssignModal
          task={modal.task}
          onClose={() => setModal(null)}
          onAssigned={handleSaved}
        />
      )}

      {modal?.type === 'delete' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Delete Task</h2>
              <button onClick={() => setModal(null)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-600">
                Delete <span className="font-semibold text-gray-900">&ldquo;{modal.task.title}&rdquo;</span>? This cannot be undone.
              </p>
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setModal(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={() => handleDelete(modal.task)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for open menus */}
      {menuId && <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />}
    </div>
  );
}
