import { Request } from 'express';

// ── Role enums (mirrors Prisma schema) ────────────────────────────────────────

export type SystemRole  = 'ADMIN' | 'USER';
export type TeamRole    = 'OWNER' | 'ADMIN' | 'MEMBER';
export type ProjectRole = 'MANAGER' | 'CONTRIBUTOR' | 'VIEWER';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  userId: string;
  email: string;
  role: SystemRole;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string>[];
}
