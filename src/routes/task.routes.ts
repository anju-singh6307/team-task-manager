import { Router } from 'express';
import { body } from 'express-validator';
import {
  getTasks,
  getTaskStats,
  getTaskById,
  createTask,
  updateTask,
  assignTask,
  bulkUpdateTasks,
  deleteTask,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

router.use(authenticate);

// ── Non-parameterised routes first (prevent Express matching them as /:id) ───

// GET  /api/tasks/stats
router.get('/stats', getTaskStats);

// PATCH /api/tasks/bulk
router.patch(
  '/bulk',
  [
    body('updates').isArray({ min: 1 }).withMessage('updates must be a non-empty array'),
    body('updates.*.id').notEmpty().withMessage('Each update must include an id'),
    body('updates.*.status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
    body('updates.*.position').optional().isInt({ min: 0 }),
  ],
  validate,
  bulkUpdateTasks,
);

// ── Collection ────────────────────────────────────────────────────────────────

// GET  /api/tasks?projectId=&status=&priority=&assigneeId=&createdById=
router.get('/', getTasks);

// POST /api/tasks
router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
    body('projectId').notEmpty().withMessage('projectId is required'),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('assigneeId').optional({ nullable: true }).isString(),
    body('position').optional().isInt({ min: 0 }),
  ],
  validate,
  createTask,
);

// ── Resource ──────────────────────────────────────────────────────────────────

// GET  /api/tasks/:id
router.get('/:id', getTaskById);

// PATCH /api/tasks/:id
router.patch(
  '/:id',
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('description').optional({ nullable: true }).isString(),
    body('status').optional().isIn(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
    body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body('assigneeId').optional({ nullable: true }).isString(),
    body('position').optional().isInt({ min: 0 }),
  ],
  validate,
  updateTask,
);

// PATCH /api/tasks/:id/assign   — dedicated assignment endpoint
router.patch(
  '/:id/assign',
  [
    body('assigneeId')
      .optional({ nullable: true })
      .isString()
      .withMessage('assigneeId must be a string or null'),
  ],
  validate,
  assignTask,
);

// DELETE /api/tasks/:id
router.delete('/:id', deleteTask);

export default router;
