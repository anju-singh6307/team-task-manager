export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  startDate?: string | null;
  endDate?: string | null;
  teamId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  position: number;
  dueDate?: string | null;
  projectId: string;
  assigneeId?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assignee?: Pick<User, 'id' | 'name' | 'email'> | null;
  project?: Pick<Project, 'id' | 'name'> & { teamId: string };
}

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';
  joinedAt: string;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface ProjectWithMeta extends Project {
  team: Pick<Team, 'id' | 'name'>;
  createdBy: Pick<User, 'id' | 'name' | 'email'>;
  members: ProjectMember[];
  _count: { tasks: number };
}

export type TaskStatus = Task['status'];
export type TaskPriority = Task['priority'];
export type ProjectStatus = Project['status'];

export interface ProjectDetail extends ProjectWithMeta {
  tasks: (Task & {
    assignee: Pick<User, 'id' | 'name' | 'email'> | null;
  })[];
}

export interface TaskStats {
  byStatus:   Partial<Record<TaskStatus,   number>>;
  byPriority: Partial<Record<TaskPriority, number>>;
  overdue: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
