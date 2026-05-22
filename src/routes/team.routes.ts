import { Router } from 'express';
import { body } from 'express-validator';
import {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
} from '../controllers/team.controller';
import {
  authenticate,
  requireTeamRole,
  requireTeamMember,
} from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

// ── Any authenticated user ────────────────────────────────────────────────────
// GET /api/teams       — list teams the user belongs to
router.get('/', getTeams);

// GET /api/teams/:id   — team detail (members can view)
router.get('/:id', requireTeamMember, getTeamById);

// POST /api/teams      — any authenticated user can create a team
router.post(
  '/',
  [body('name').trim().notEmpty().isLength({ max: 100 })],
  validate,
  createTeam,
);

// ── OWNER or ADMIN ────────────────────────────────────────────────────────────
// PATCH /api/teams/:id   — update team settings (OWNER or ADMIN only)
router.patch(
  '/:id',
  requireTeamRole('OWNER', 'ADMIN'),
  [body('name').optional().trim().isLength({ max: 100 })],
  validate,
  updateTeam,
);

// POST /api/teams/:id/members  — add a member (OWNER or ADMIN only)
router.post(
  '/:id/members',
  requireTeamRole('OWNER', 'ADMIN'),
  [
    body('userId').notEmpty(),
    body('role').optional().isIn(['OWNER', 'ADMIN', 'MEMBER']),
  ],
  validate,
  addMember,
);

// ── OWNER only ────────────────────────────────────────────────────────────────
// DELETE /api/teams/:id  — disband the team (OWNER only)
router.delete('/:id', requireTeamRole('OWNER'), deleteTeam);

// ── OWNER / ADMIN or self-remove ──────────────────────────────────────────────
// DELETE /api/teams/:id/members/:userId
// Controller handles the self-vs-admin distinction; no extra guard needed here.
router.delete('/:id/members/:userId', requireTeamMember, removeMember);

export default router;
