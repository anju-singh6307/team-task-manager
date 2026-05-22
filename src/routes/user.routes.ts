import { Router } from 'express';
import { body } from 'express-validator';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import {
  authenticate,
  requireAdmin,
  requireSelfOrAdmin,
  requireSelf,
} from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

// ── System admin only ─────────────────────────────────────────────────────────
// GET /api/users  — list all users (ADMIN only)
router.get('/', requireAdmin, getUsers);

// ── Any authenticated user ────────────────────────────────────────────────────
// GET /api/users/:id
router.get('/:id', getUserById);

// ── Self or admin ─────────────────────────────────────────────────────────────
// PATCH /api/users/:id  — update own profile; admin can update any
router.patch(
  '/:id',
  requireSelfOrAdmin,
  [
    body('name').optional().trim().isLength({ min: 2, max: 50 }),
    body('password').optional().isLength({ min: 8 }),
  ],
  validate,
  updateUser,
);

// ── Self only (password change / account deletion) ────────────────────────────
// DELETE /api/users/:id  — users delete their own account; admins use requireSelfOrAdmin
router.delete('/:id', requireSelf, deleteUser);

export default router;
