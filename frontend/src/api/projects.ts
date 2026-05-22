import { api } from './client';
import type { ProjectWithMeta, ProjectDetail } from '../types';

export interface CreateProjectPayload {
  name: string;
  teamId: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
}

export const projectsApi = {
  list: (params?: { teamId?: string }) =>
    api.get<{ data: { projects: ProjectWithMeta[] } }>('/projects', { params }),

  getById: (id: string) =>
    api.get<{ data: { project: ProjectDetail } }>(`/projects/${id}`),

  create: (data: CreateProjectPayload) =>
    api.post<{ data: { project: ProjectWithMeta } }>('/projects', data),

  update: (id: string, data: UpdateProjectPayload) =>
    api.patch<{ data: { project: ProjectWithMeta } }>(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),

  addMember: (projectId: string, userId: string, role?: string) =>
    api.post(`/projects/${projectId}/members`, { userId, role }),

  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};
