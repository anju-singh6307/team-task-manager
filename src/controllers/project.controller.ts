import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../types';

const projectInclude = {
  team: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  members: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { tasks: true } },
};

async function assertTeamMember(userId: string, teamId: string) {
  const membership = await prisma.teamMember.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  if (!membership) throw new AppError('You are not a member of this team', 403);
  return membership;
}

async function assertProjectRole(
  userId: string,
  projectId: string,
  allowedRoles: string[],
) {
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!membership || !allowedRoles.includes(membership.role)) {
    throw new AppError('Insufficient project permissions', 403);
  }
  return membership;
}

export async function getProjects(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teamId } = req.query;

    const projects = await prisma.project.findMany({
      where: {
        ...(teamId && { teamId: String(teamId) }),
        members: { some: { userId: req.user!.userId } },
      },
      include: projectInclude,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: { projects } });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        ...projectInclude,
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ status: 'asc' }, { position: 'asc' }],
        },
      },
    });
    if (!project) throw new AppError('Project not found', 404);
    res.json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, teamId, startDate, endDate } = req.body;

    await assertTeamMember(req.user!.userId, teamId);

    const project = await prisma.project.create({
      data: {
        name,
        description,
        teamId,
        createdById: req.user!.userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        members: { create: { userId: req.user!.userId, role: 'MANAGER' } },
      },
      include: projectInclude,
    });

    res.status(201).json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name, description, status, startDate, endDate } = req.body;

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user!.userId, projectId: id } },
    });

    if (!membership || (membership.role !== 'MANAGER' && req.user!.role !== 'ADMIN')) {
      throw new AppError('Only project managers can update this project', 403);
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
      include: projectInclude,
    });

    res.json({ success: true, data: { project } });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    await assertProjectRole(req.user!.userId, id, ['MANAGER']);

    await prisma.project.delete({ where: { id } });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
}

export async function addProjectMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { userId, role } = req.body;

    await assertProjectRole(req.user!.userId, id, ['MANAGER']);

    const project = await prisma.project.findUnique({ where: { id }, select: { teamId: true } });
    if (!project) throw new AppError('Project not found', 404);

    const teamMember = await prisma.teamMember.findUnique({
      where: { userId_teamId: { userId, teamId: project.teamId } },
    });
    if (!teamMember) throw new AppError('User must be a team member first', 400);

    const member = await prisma.projectMember.create({
      data: { userId, projectId: id, role: role ?? 'CONTRIBUTOR' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    res.status(201).json({ success: true, data: { member } });
  } catch (err) {
    next(err);
  }
}

export async function removeProjectMember(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, userId } = req.params;

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user!.userId, projectId: id } },
    });

    const isManager = membership?.role === 'MANAGER';
    const isSelf = req.user!.userId === userId;

    if (!isManager && !isSelf && req.user!.role !== 'ADMIN') {
      throw new AppError('Forbidden', 403);
    }

    await prisma.projectMember.delete({
      where: { userId_projectId: { userId, projectId: id } },
    });

    res.json({ success: true, message: 'Member removed from project' });
  } catch (err) {
    next(err);
  }
}
