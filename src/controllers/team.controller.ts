import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../types';

export async function getTeams(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await prisma.team.findMany({
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { teams } });
  } catch (err) {
    next(err);
  }
}

export async function getTeamById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        projects: { orderBy: { createdAt: 'desc' as const } },
      },
    });
    if (!team) throw new AppError('Team not found', 404);
    res.json({ success: true, data: { team } });
  } catch (err) {
    next(err);
  }
}

export async function createTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description } = req.body;

    const team = await prisma.team.create({
      data: {
        name,
        description,
        members: { create: { userId: req.user!.userId, role: 'ADMIN' } },
      },
      include: { members: true },
    });

    res.status(201).json({ success: true, data: { team } });
  } catch (err) {
    next(err);
  }
}

export async function updateTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: req.user!.userId, teamId: id } },
    });

    if (!membership || (membership.role !== 'ADMIN' && req.user!.role !== 'ADMIN')) {
      throw new AppError('Forbidden: only team admins can update', 403);
    }

    const team = await prisma.team.update({
      where: { id },
      data: { name, description },
    });

    res.json({ success: true, data: { team } });
  } catch (err) {
    next(err);
  }
}

export async function deleteTeam(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: req.user!.userId, teamId: id } },
    });

    if (!membership || (membership.role !== 'ADMIN' && req.user!.role !== 'ADMIN')) {
      throw new AppError('Forbidden: only team admins can delete', 403);
    }

    await prisma.team.delete({ where: { id } });
    res.json({ success: true, message: 'Team deleted' });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: req.user!.userId, teamId: id } },
    });

    if (!membership || membership.role !== 'ADMIN') {
      throw new AppError('Forbidden: only team admins can add members', 403);
    }

    const member = await prisma.teamMember.create({
      data: { userId, teamId: id, role: role ?? 'MEMBER' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ success: true, data: { member } });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, userId } = req.params;

    const membership = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId: req.user!.userId, teamId: id } },
    });

    if (!membership || (membership.role !== 'ADMIN' && req.user!.userId !== userId)) {
      throw new AppError('Forbidden', 403);
    }

    await prisma.teamMember.delete({
      where: { userId_teamId: { userId, teamId: id } },
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}
