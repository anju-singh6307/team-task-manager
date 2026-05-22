import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderKanban,
  Calendar,
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  Eye,
  Ban,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { projectsApi, type UpdateProjectPayload } from '../api/projects';
import { Modal } from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import type { ProjectDetail, TaskStatus } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; badge: string; dot: string }> = {
  PLANNING:  { label: 'Planning',   badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  ACTIVE:    { label: 'Active',     badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  ON_HOLD:   { label: 'On Hold',    badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed',  badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  ARCHIVED:  { label: 'Archived',   badge: 'bg-gray-200 text-gray-500',   dot: 'bg-gray-300' },
};

const TASK_STATUS_META: Record<TaskStatus, { label: string; icon: React.ComponentType<{ className?: string }>; badge: string; dot: string }> = {
  TODO:        { label: 'To Do',       icon: CheckSquare,  badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  IN_PROGRESS: { label: 'In Progress', icon: Clock,        badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  IN_REVIEW:   { label: 'In Review',   icon: Eye,          badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  DONE:        { label: 'Done',        icon: CheckCircle2, badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  CANCELLED:   { label: 'Cancelled',   icon: Ban,          badge: 'bg-red-100 text-red-600',     dot: 'bg-red-400' },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  LOW:    { label: 'Low',    badge: 'bg-gray-100 text-gray-500' },
  MEDIUM: { label: 'Medium', badge: 'bg-blue-100 text-blue-600' },
  HIGH:   { label: 'High',   badge: 'bg-orange-100 text-orange-600' },
  URGENT: { label: 'Urgent', badge: 'bg-red-100 text-red-600' },
};

const TASK_STATUS_ORDER: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'];

// ── Edit form ─────────────────────────────────────────────────────────────────

interface EditFormValues {
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
}

function EditProjectForm({
  project,
  onSave,
  onCancel,
}: {
  project: ProjectDetail;
  onSave: (p: ProjectDetail) => void;
  onCancel: () => void;
}) {
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    defaultValues: {
      name: project.name,
      description: project.description ?? '',
      status: project.status,
      startDate: project.startDate ? project.startDate.slice(0, 10) : '',
      endDate: project.endDate ? project.endDate.slice(0, 10) : '',
    },
  });

  async function onSubmit(values: EditFormValues) {
    setServerError('');
    try {
      const payload: UpdateProjectPayload = {
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
      };
      const res = await projectsApi.update(project.id, payload);
      onSave({ ...project, ...res.data.data!.project });
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setServerError(msg ?? 'Failed to update project');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Project name</label>
        <input
          type="text"
          {...register('name', { required: true, maxLength: 100 })}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={2}
          {...register('description')}
          className="w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
        <select
          {...register('status')}
          className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        >
          {Object.entries(STATUS_META).map(([val, { label }]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Start date</label>
          <input type="date" {...register('startDate')} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">End date</label>
          <input type="date" {...register('endDate')} className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          Save changes
        </button>
      </div>
    </form>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    projectsApi
      .getById(id)
      .then((res) => setProject(res.data.data?.project ?? null))
      .finally(() => setIsLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!project) return;
    setDeleteLoading(true);
    try {
      await projectsApi.delete(project.id);
      navigate('/projects');
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-32 rounded bg-gray-200" />
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-200" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <FolderKanban className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-lg font-semibold text-gray-500">Project not found</p>
        <Link to="/projects" className="mt-3 text-sm text-indigo-600 hover:underline">
          ← Back to projects
        </Link>
      </div>
    );
  }

  const status = STATUS_META[project.status];

  // Task stats
  const taskCounts = TASK_STATUS_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = project.tasks.filter((t) => t.status === s).length;
    return acc;
  }, {});

  // Filtered tasks
  const visibleTasks =
    activeFilter === 'ALL'
      ? project.tasks
      : project.tasks.filter((t) => t.status === activeFilter);

  const formattedStart = project.startDate
    ? new Date(project.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const formattedEnd = project.endDate
    ? new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      {/* Project header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
              <FolderKanban className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  {status.label}
                </span>
                <span className="text-xs text-gray-400">{project.team.name}</span>
                {formattedStart && (
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" /> {formattedStart}
                    {formattedEnd && ` → ${formattedEnd}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-10 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => { setMenuOpen(false); setShowEdit(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit project
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setShowDelete(true); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete project
                </button>
              </div>
            )}
          </div>
        </div>

        {project.description && (
          <p className="mt-4 text-sm text-gray-600">{project.description}</p>
        )}
      </div>

      {/* Task status stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TASK_STATUS_ORDER.map((s) => {
          const meta = TASK_STATUS_META[s];
          const Icon = meta.icon;
          const count = taskCounts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setActiveFilter(activeFilter === s ? 'ALL' : s)}
              className={`flex flex-col items-center rounded-xl border p-4 text-center transition-all ${
                activeFilter === s
                  ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Icon className={`mb-1.5 h-5 w-5 ${activeFilter === s ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span className={`text-xl font-bold ${activeFilter === s ? 'text-indigo-700' : 'text-gray-900'}`}>
                {count}
              </span>
              <span className="mt-0.5 text-xs text-gray-500">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tasks list */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-900">
            Tasks
            {activeFilter !== 'ALL' && (
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${TASK_STATUS_META[activeFilter].badge}`}>
                {TASK_STATUS_META[activeFilter].label}
              </span>
            )}
          </h3>
          {activeFilter !== 'ALL' && (
            <button
              onClick={() => setActiveFilter('ALL')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Show all
            </button>
          )}
        </div>

        {visibleTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="mb-3 h-9 w-9 text-gray-200" />
            <p className="text-sm font-medium text-gray-500">No tasks found</p>
            <p className="mt-1 text-xs text-gray-400">
              {activeFilter === 'ALL' ? 'Tasks created in this project will appear here.' : 'No tasks with this status.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visibleTasks.map((task) => {
              const ts = TASK_STATUS_META[task.status];
              const tp = PRIORITY_META[task.priority];
              return (
                <div key={task.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${ts.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
                    {task.assignee && (
                      <p className="mt-0.5 text-xs text-gray-400">{task.assignee.name}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {task.dueDate && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tp.badge}`}>
                      {tp.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ts.badge}`}>
                      {ts.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Members */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-4">
          <Users className="h-4 w-4 text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900">
            Members ({project.members.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {project.members.map((member) => {
            const initials = member.user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
            const roleColors: Record<string, string> = {
              MANAGER:     'bg-indigo-100 text-indigo-700',
              CONTRIBUTOR: 'bg-green-100 text-green-700',
              VIEWER:      'bg-gray-100 text-gray-600',
            };
            return (
              <div key={member.userId} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                  <p className="text-xs text-gray-400">{member.user.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${roleColors[member.role]}`}>
                  {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <Modal title="Edit Project" onClose={() => setShowEdit(false)}>
          <EditProjectForm
            project={project}
            onSave={(updated) => { setProject(updated); setShowEdit(false); }}
            onCancel={() => setShowEdit(false)}
          />
        </Modal>
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <Modal title="Delete Project" size="sm" onClose={() => setShowDelete(false)}>
          <p className="text-sm text-gray-600">
            Delete <span className="font-semibold text-gray-900">{project.name}</span>? All{' '}
            {project.tasks.length} task{project.tasks.length !== 1 ? 's' : ''} will be permanently removed.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setShowDelete(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              Delete project
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
