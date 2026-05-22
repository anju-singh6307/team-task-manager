import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/error.middleware';
import { AuthRequest } from '../types';

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  project: { select: { id: true, name: true, teamId: true } },
};

// ── Guards ────────────────────────────────────────────────────────────────────

async function assertProjectMember(userId: string, projectId: string) {
  const m = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  if (!m) throw new AppError('You are not a member of this project', 403);
  return m;
}

async function assertAssigneeIsMember(assigneeId: string, projectId: string) {
  const m = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: assigneeId, projectId } },
  });
  if (!m) throw new AppError('Assignee must be a member of this project', 400);
}

// ── GET /tasks ────────────────────────────────────────────────────────────────

export async function getTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, status, priority, assigneeId, createdById } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        ...(projectId   && { projectId:   String(projectId) }),
        ...(status      && { status:      status      as never }),
        ...(priority    && { priority:    priority    as never }),
        ...(assigneeId  && { assigneeId:  String(assigneeId) }),
        ...(createdById && { createdById: String(createdById) }),
      },
      include: taskInclude,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: { tasks } });
  } catch (err) {
    next(err);
  }
}

// ── GET /tasks/stats ──────────────────────────────────────────────────────────

export async function getTaskStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { projectId, assigneeId } = req.query;

    const where = {
      ...(projectId  && { projectId:  String(projectId) }),
      ...(assigneeId && { assigneeId: String(assigneeId) }),
    };

    const [statusGroups, priorityGroups, overdueCount] = await Promise.all([
      prisma.task.groupBy({ by: ['status'],   where, _count: { id: true } }),
      prisma.task.groupBy({ by: ['priority'], where, _count: { id: true } }),
      prisma.task.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status:  { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);

    const byStatus   = Object.fromEntries(statusGroups.map((g)   => [g.status,   g._count.id]));
    const byPriority = Object.fromEntries(priorityGroups.map((g) => [g.priority, g._count.id]));

    res.json({ success: true, data: { byStatus, byPriority, overdue: overdueCount } });
  } catch (err) {
    next(err);
  }
}

// ── GET /tasks/:id ────────────────────────────────────────────────────────────

export async function getTaskById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskInclude });
    if (!task) throw new AppError('Task not found', 404);
    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

// ── POST /tasks ───────────────────────────────────────────────────────────────

export async function createTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, status, priority, dueDate, projectId, assigneeId, position } = req.body;

    await assertProjectMember(req.user!.userId, projectId);
    if (assigneeId) await assertAssigneeIsMember(assigneeId, projectId);

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status,
        priority,
        position: position ?? 0,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        projectId,
        assigneeId:  assigneeId ?? undefined,
        createdById: req.user!.userId,
      },
      include: taskInclude,
    });

    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /tasks/:id ──────────────────────────────────────────────────────────

export async function updateTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError('Task not found', 404);

    await assertProjectMember(req.user!.userId, existing.projectId);

    const { title, description, status, priority, dueDate, assigneeId, position } = req.body;

    // Validate the new assignee belongs to the project before writing
    if (assigneeId != null && assigneeId !== undefined) {
      await assertAssigneeIsMember(assigneeId, existing.projectId);
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status      !== undefined && { status }),
        ...(priority    !== undefined && { priority }),
        ...(position    !== undefined && { position }),
        ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(assigneeId  !== undefined && { assigneeId }),
      },
      include: taskInclude,
    });

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /tasks/:id/assign ───────────────────────────────────────────────────

export async function assignTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { assigneeId } = req.body; // string | null

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError('Task not found', 404);

    await assertProjectMember(req.user!.userId, existing.projectId);

    if (assigneeId) await assertAssigneeIsMember(assigneeId, existing.projectId);

    const task = await prisma.task.update({
      where: { id },
      data:  { assigneeId: assigneeId ?? null },
      include: taskInclude,
    });

    res.json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

// ── PATCH /tasks/bulk ─────────────────────────────────────────────────────────

export async function bulkUpdateTasks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { updates } = req.body as {
      updates: Array<{ id: string; status?: string; position?: number }>;
    };

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new AppError('updates must be a non-empty array', 400);
    }

    const ids   = updates.map((u) => u.id);
    const found = await prisma.task.findMany({ where: { id: { in: ids } } });

    if (found.length !== ids.length) throw new AppError('One or more tasks not found', 404);

    // Verify membership for every distinct project touched
    const projectIds = [...new Set(found.map((t) => t.projectId))];
    await Promise.all(projectIds.map((pid) => assertProjectMember(req.user!.userId, pid)));

    const updated = await prisma.$transaction(
      updates.map((u) =>
        prisma.task.update({
          where: { id: u.id },
          data: {
            ...(u.status   !== undefined && { status:   u.status   as never }),
            ...(u.position !== undefined && { position: u.position }),
          },
          include: taskInclude,
        }),
      ),
    );

    res.json({ success: true, data: { tasks: updated } });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /tasks/:id ─────────────────────────────────────────────────────────

export async function deleteTask(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing) throw new AppError('Task not found', 404);

    const membership = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId: req.user!.userId, projectId: existing.projectId } },
    });

    const isCreator  = existing.createdById === req.user!.userId;
    const isManager  = membership?.role === 'MANAGER';
    const isSysAdmin = req.user!.role === 'ADMIN';

    if (!isCreator && !isManager && !isSysAdmin) throw new AppError('Forbidden', 403);

    await prisma.task.delete({ where: { id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
}
