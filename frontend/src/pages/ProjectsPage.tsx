import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Plus,
  FolderKanban,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  CheckSquare,
  ChevronRight,
} from 'lucide-react';
import axios from 'axios';
import { projectsApi, type CreateProjectPayload, type UpdateProjectPayload } from '../api/projects';
import { teamsApi } from '../api/teams';
import { Modal } from '../components/ui/Modal';
import type { ProjectWithMeta, Team } from '../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; badge: string; dot: string }
> = {
  PLANNING:  { label: 'Planning',   badge: 'bg-gray-100 text-gray-600',   dot: 'bg-gray-400' },
  ACTIVE:    { label: 'Active',     badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  ON_HOLD:   { label: 'On Hold',    badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  COMPLETED: { label: 'Completed',  badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  ARCHIVED:  { label: 'Archived',   badge: 'bg-gray-200 text-gray-500',   dot: 'bg-gray-300' },
};

const STATUS_OPTIONS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;

// ── Project Form ──────────────────────────────────────────────────────────────

interface ProjectFormValues {
  name: string;
  description: string;
  teamId: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface ProjectFormProps {
  teams: Team[];
  defaultValues?: Partial<ProjectFormValues>;
  isEditing?: boolean;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel: () => void;
}

function ProjectForm({ teams, defaultValues, isEditing, onSubmit, onCancel }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormValues>({ defaultValues });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Project name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Website Redesign"
          {...register('name', { required: 'Project name is required', maxLength: { value: 100, message: 'Max 100 characters' } })}
          className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
            errors.name ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
          }`}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={2}
          placeholder="Short description..."
          {...register('description')}
          className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Team — only shown when creating */}
      {!isEditing && (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Team <span className="text-red-500">*</span>
          </label>
          <select
            {...register('teamId', { required: 'Select a team' })}
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-indigo-500 ${
              errors.teamId ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
            }`}
          >
            <option value="">Select a team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {errors.teamId && <p className="mt-1 text-xs text-red-600">{errors.teamId.message}</p>}
        </div>
      )}

      {/* Status */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Status</label>
        <select
          {...register('status')}
          className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Start date</label>
          <input
            type="date"
            {...register('startDate')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">End date</label>
          <input
            type="date"
            {...register('endDate')}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {isSubmitting && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isEditing ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </form>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectWithMeta;
  onEdit: (p: ProjectWithMeta) => void;
  onDelete: (p: ProjectWithMeta) => void;
}

function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const status = STATUS_META[project.status];

  useEffect(() => {
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const memberInitials = project.members.slice(0, 3).map((m) =>
    m.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
  );
  const extraMembers = project.members.length - 3;

  const formattedEnd = project.endDate
    ? new Date(project.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
            <FolderKanban className="h-4.5 w-4.5 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <Link
              to={`/projects/${project.id}`}
              className="block truncate text-sm font-semibold text-gray-900 hover:text-indigo-600"
            >
              {project.name}
            </Link>
            <p className="text-xs text-gray-400">{project.team.name}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>

          {/* Dropdown menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen((v) => !v); }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  onClick={() => { setMenuOpen(false); onEdit(project); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onDelete(project); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="mt-3 line-clamp-2 text-xs text-gray-500">{project.description}</p>
      )}

      {/* Meta */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <CheckSquare className="h-3.5 w-3.5" />
            {project._count.tasks} task{project._count.tasks !== 1 ? 's' : ''}
          </span>
          {formattedEnd && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formattedEnd}
            </span>
          )}
        </div>

        {/* Member avatars */}
        <div className="flex items-center">
          {memberInitials.map((initials, i) => (
            <div
              key={i}
              title={project.members[i].user.name}
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white ring-2 ring-white ${
                i > 0 ? '-ml-1.5' : ''
              }`}
            >
              {initials}
            </div>
          ))}
          {extraMembers > 0 && (
            <div className="-ml-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600 ring-2 ring-white">
              +{extraMembers}
            </div>
          )}
        </div>
      </div>

      {/* View link */}
      <Link
        to={`/projects/${project.id}`}
        className="mt-4 flex items-center justify-center gap-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
      >
        Open project <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-lg bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-20 rounded bg-gray-200" />
        </div>
        <div className="h-5 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="mt-3 h-3 w-full rounded bg-gray-200" />
      <div className="mt-1 h-3 w-3/4 rounded bg-gray-200" />
      <div className="mt-4 h-8 rounded-lg bg-gray-100" />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithMeta | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectWithMeta | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [projRes, teamsRes] = await Promise.all([
          projectsApi.list(),
          teamsApi.list(),
        ]);
        setProjects(projRes.data.data?.projects ?? []);
        setTeams(teamsRes.data.data?.teams ?? []);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreate(values: ProjectFormValues) {
    setError('');
    try {
      const payload: CreateProjectPayload = {
        name: values.name,
        teamId: values.teamId,
        description: values.description || undefined,
        status: values.status || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      };
      const res = await projectsApi.create(payload);
      setProjects((prev) => [res.data.data!.project, ...prev]);
      setShowModal(false);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(msg ?? 'Failed to create project');
    }
  }

  async function handleEdit(values: ProjectFormValues) {
    if (!editingProject) return;
    setError('');
    try {
      const payload: UpdateProjectPayload = {
        name: values.name,
        description: values.description || undefined,
        status: values.status,
        startDate: values.startDate || null,
        endDate: values.endDate || null,
      };
      const res = await projectsApi.update(editingProject.id, payload);
      setProjects((prev) =>
        prev.map((p) => (p.id === editingProject.id ? res.data.data!.project : p)),
      );
      setEditingProject(null);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
      setError(msg ?? 'Failed to update project');
    }
  }

  async function handleDelete() {
    if (!deletingProject) return;
    setDeleteLoading(true);
    try {
      await projectsApi.delete(deletingProject.id);
      setProjects((prev) => prev.filter((p) => p.id !== deletingProject.id));
      setDeletingProject(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  const toDateInput = (iso?: string | null) =>
    iso ? iso.slice(0, 10) : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="mt-1 text-sm text-gray-500">
            {isLoading ? '…' : `${projects.length} project${projects.length !== 1 ? 's' : ''} you're part of`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <FolderKanban className="mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No projects yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Create a project to start managing tasks with your team
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={setEditingProject}
              onDelete={setDeletingProject}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <Modal
          title="New Project"
          description="Create a project to organize tasks for your team."
          onClose={() => { setShowModal(false); setError(''); }}
        >
          <ProjectForm
            teams={teams}
            defaultValues={{ status: 'PLANNING' }}
            onSubmit={handleCreate}
            onCancel={() => { setShowModal(false); setError(''); }}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingProject && (
        <Modal
          title="Edit Project"
          onClose={() => { setEditingProject(null); setError(''); }}
          isEditing
        >
          <ProjectForm
            teams={teams}
            isEditing
            defaultValues={{
              name: editingProject.name,
              description: editingProject.description ?? '',
              status: editingProject.status,
              startDate: toDateInput(editingProject.startDate),
              endDate: toDateInput(editingProject.endDate),
            }}
            onSubmit={handleEdit}
            onCancel={() => { setEditingProject(null); setError(''); }}
          />
        </Modal>
      )}

      {/* Delete confirmation Modal */}
      {deletingProject && (
        <Modal
          title="Delete Project"
          size="sm"
          onClose={() => setDeletingProject(null)}
        >
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900">{deletingProject.name}</span>? All
            tasks inside will be permanently removed.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={() => setDeletingProject(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteLoading && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Delete project
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

