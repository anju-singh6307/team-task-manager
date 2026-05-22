import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refresh, logout, logoutAll, me } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('name').trim().notEmpty().isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number'),
  ],
  validate,
  register,
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login,
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  refresh,
);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/logout-all  (requires auth)
router.post('/logout-all', authenticate, logoutAll);

// GET /api/auth/me  (requires auth)
router.get('/me', authenticate, me);

export default router;
