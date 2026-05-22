import { Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { prisma } from '../lib/prisma';
import type { AuthRequest, SystemRole, TeamRole, ProjectRole } from '../types';

// ── Authentication ────────────────────────────────────────────────────────────

/**
 * Verifies the Bearer token and attaches `req.user`.
 * Must be the first middleware on every protected route.
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired' });
    } else if (err instanceof JsonWebTokenError) {
      res.status(401).json({ success: false, message: 'Invalid token' });
    } else {
      res.status(401).json({ success: false, message: 'Authentication failed' });
    }
  }
}

// ── System-level role guards ──────────────────────────────────────────────────

/**
 * Factory — allows only users whose SystemRole is in the given list.
 *
 * Usage:
 *   router.get('/admin-only', authenticate, requireSystemRole('ADMIN'), handler)
 *   router.get('/any-user',   authenticate, requireSystemRole('ADMIN', 'USER'), handler)
 */
export function requireSystemRole(...roles: SystemRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Requires system role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
}

/** Shorthand: platform-wide ADMIN only */
export const requireAdmin = requireSystemRole('ADMIN');

// ── Team-level role guards ────────────────────────────────────────────────────

/**
 * Factory — reads `teamId` from `req.params` (tries `.teamId` then `.id`)
 * and verifies the user holds one of the given TeamRoles.
 *
 * System ADMINs always bypass the check.
 *
 * Usage:
 *   router.patch('/:id',         authenticate, requireTeamRole('OWNER','ADMIN'), updateTeam)
 *   router.delete('/:id',        authenticate, requireTeamRole('OWNER'),          deleteTeam)
 *   router.post('/:id/members',  authenticate, requireTeamRole('OWNER','ADMIN'), addMember)
 */
export function requireTeamRole(...roles: TeamRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    // System admins bypass team-role checks
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const teamId = req.params.teamId ?? req.params.id;
    if (!teamId) {
      res.status(400).json({ success: false, message: 'teamId not found in request params' });
      return;
    }

    try {
      const membership = await prisma.teamMember.findUnique({
        where: { userId_teamId: { userId: req.user.userId, teamId } },
      });

      if (!membership) {
        res.status(403).json({ success: false, message: 'You are not a member of this team' });
        return;
      }

      if (!roles.includes(membership.role as TeamRole)) {
        res.status(403).json({
          success: false,
          message: `Requires team role: ${roles.join(' or ')}`,
        });
        return;
      }

      next();
    } catch {
      next(new Error('Failed to verify team membership'));
    }
  };
}

/**
 * Shorthand: any team member (OWNER, ADMIN, or MEMBER).
 * Use this to gate read/write operations that require team membership
 * without caring about the specific role.
 */
export const requireTeamMember = requireTeamRole('OWNER', 'ADMIN', 'MEMBER');

// ── Project-level role guards ─────────────────────────────────────────────────

/**
 * Factory — reads `projectId` from `req.params` (tries `.projectId` then `.id`)
 * and verifies the user holds one of the given ProjectRoles.
 *
 * System ADMINs always bypass the check.
 *
 * Usage:
 *   router.patch('/:id',        authenticate, requireProjectRole('MANAGER'),                updateProject)
 *   router.delete('/:id',       authenticate, requireProjectRole('MANAGER'),                deleteProject)
 *   router.post('/:id/members', authenticate, requireProjectRole('MANAGER'),                addProjectMember)
 *   router.get('/:id',          authenticate, requireProjectRole('MANAGER','CONTRIBUTOR','VIEWER'), getProject)
 */
export function requireProjectRole(...roles: ProjectRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    // System admins bypass project-role checks
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    const projectId = req.params.projectId ?? req.params.id;
    if (!projectId) {
      res.status(400).json({ success: false, message: 'projectId not found in request params' });
      return;
    }

    try {
      const membership = await prisma.projectMember.findUnique({
        where: { userId_projectId: { userId: req.user.userId, projectId } },
      });

      if (!membership) {
        res.status(403).json({ success: false, message: 'You are not a member of this project' });
        return;
      }

      if (!roles.includes(membership.role as ProjectRole)) {
        res.status(403).json({
          success: false,
          message: `Requires project role: ${roles.join(' or ')}`,
        });
        return;
      }

      next();
    } catch {
      next(new Error('Failed to verify project membership'));
    }
  };
}

/**
 * Shorthand: any project member regardless of role.
 */
export const requireProjectMember = requireProjectRole('MANAGER', 'CONTRIBUTOR', 'VIEWER');

// ── Ownership guards ──────────────────────────────────────────────────────────

/**
 * Allow the user themselves OR a system ADMIN.
 * Reads the target user ID from req.params.userId, falling back to req.params.id.
 *
 * Usage:
 *   router.patch('/:id', authenticate, requireSelfOrAdmin, updateUser)
 *   router.delete('/:id', authenticate, requireSelfOrAdmin, deleteUser)
 */
export function requireSelfOrAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const targetId = req.params.userId ?? req.params.id;

  if (req.user.role === 'ADMIN' || req.user.userId === targetId) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'You can only access your own resources' });
}

/**
 * Strict self-only — no admin bypass.
 * Use for highly sensitive operations (e.g. password change, account deletion).
 */
export function requireSelf(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated' });
    return;
  }

  const targetId = req.params.userId ?? req.params.id;

  if (req.user.userId === targetId) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'You can only modify your own account' });
}
