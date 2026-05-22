import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../types';

const BCRYPT_ROUNDS = 12;

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, name, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError('Email already in use', 409);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, name, password: hashedPassword },
      select: publicUserSelect,
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshTokenExpiry() },
    });

    res.status(201).json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Compare even when user is null to prevent timing attacks
    const passwordToCheck = user?.password ?? '$2a$12$invalidhashtopreventtiming';
    const valid = await bcrypt.compare(password, passwordToCheck);

    if (!user || !valid) throw new AppError('Invalid credentials', 401);

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshTokenExpiry() },
    });

    const { password: _pw, ...userWithoutPassword } = user;
    res.json({ success: true, data: { user: userWithoutPassword, accessToken, refreshToken } });
  } catch (err) {
    next(err);
  }
}

// ── Refresh token (with rotation) ─────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      // Delete if expired so it can't be replayed
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Verify JWT signature — db check alone is not sufficient
    const payload = verifyRefreshToken(refreshToken);

    // Rotate: delete old token, issue new pair
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newPayload = { userId: payload.userId, email: payload.email, role: payload.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: stored.userId, expiresAt: getRefreshTokenExpiry() },
    });

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// ── Logout all sessions ───────────────────────────────────────────────────────

export async function logoutAll(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user!.userId } });
    res.json({ success: true, message: 'All sessions terminated' });
  } catch (err) {
    next(err);
  }
}

// ── Current user ──────────────────────────────────────────────────────────────

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: publicUserSelect,
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}
