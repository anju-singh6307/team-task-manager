import { api } from './client';
import type { ApiResponse, Task, TaskStats } from '../types';

export interface CreateTaskPayload {
  title: string;
  projectId: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string | null;
  position?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  assigneeId?: string | null;
  position?: number;
}

export interface BulkUpdateItem {
  id: string;
  status?: string;
  position?: number;
}

export const tasksApi = {
  list: (params?: {
    projectId?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    createdById?: string;
  }) => api.get<ApiResponse<{ tasks: Task[] }>>('/tasks', { params }),

  stats: (params?: { projectId?: string; assigneeId?: string }) =>
    api.get<ApiResponse<TaskStats>>('/tasks/stats', { params }),

  getById: (id: string) =>
    api.get<ApiResponse<{ task: Task }>>(`/tasks/${id}`),

  create: (payload: CreateTaskPayload) =>
    api.post<ApiResponse<{ task: Task }>>('/tasks', payload),

  update: (id: string, payload: UpdateTaskPayload) =>
    api.patch<ApiResponse<{ task: Task }>>(`/tasks/${id}`, payload),

  /** Dedicated assign/unassign — pass null to remove the assignee */
  assign: (id: string, assigneeId: string | null) =>
    api.patch<ApiResponse<{ task: Task }>>(`/tasks/${id}/assign`, { assigneeId }),

  /** Batch update status/position (Kanban reorder, bulk status change) */
  bulkUpdate: (updates: BulkUpdateItem[]) =>
    api.patch<ApiResponse<{ tasks: Task[] }>>('/tasks/bulk', { updates }),

  delete: (id: string) =>
    api.delete<ApiResponse>(`/tasks/${id}`),
};
