import { Router } from 'express';
import { body } from 'express-validator';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
} from '../controllers/project.controller';
import {
  authenticate,
  requireProjectRole,
  requireProjectMember,
} from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

// ── Any authenticated user ────────────────────────────────────────────────────
// GET /api/projects    — list projects the user is a member of
router.get('/', getProjects);

// POST /api/projects   — any user who belongs to the target team can create a project
// (team membership is validated inside the controller)
router.post(
  '/',
  [
    body('name').trim().notEmpty().isLength({ max: 100 }),
    body('teamId').notEmpty(),
    body('status').optional().isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  validate,
  createProject,
);

// ── Any project member ────────────────────────────────────────────────────────
// GET /api/projects/:id  — read project detail (any project member)
router.get('/:id', requireProjectMember, getProjectById);

// ── MANAGER only ──────────────────────────────────────────────────────────────
// PATCH /api/projects/:id   — update project (MANAGER only)
router.patch(
  '/:id',
  requireProjectRole('MANAGER'),
  [
    body('name').optional().trim().isLength({ max: 100 }),
    body('status').optional().isIn(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
  ],
  validate,
  updateProject,
);

// DELETE /api/projects/:id  — delete project (MANAGER only)
router.delete('/:id', requireProjectRole('MANAGER'), deleteProject);

// POST /api/projects/:id/members  — add member (MANAGER only)
router.post(
  '/:id/members',
  requireProjectRole('MANAGER'),
  [
    body('userId').notEmpty(),
    body('role').optional().isIn(['MANAGER', 'CONTRIBUTOR', 'VIEWER']),
  ],
  validate,
  addProjectMember,
);

// ── MANAGER or self-remove ────────────────────────────────────────────────────
// DELETE /api/projects/:id/members/:userId
// Controller allows non-managers to remove themselves;
// requireProjectMember just ensures the requester is at least in the project.
router.delete('/:id/members/:userId', requireProjectMember, removeProjectMember);

export default router;
