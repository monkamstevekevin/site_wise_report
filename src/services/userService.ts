'use server';

import { db } from '@/db';
import { users, userAssignments, organizations } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { User, UserRole, UserAssignment } from '@/lib/types';
import { addNotification } from './notificationService';
import { getProjectById } from './projectService';
import { requireRole } from '@/lib/auth/serverAuth';

// ─── Mapper DB → type applicatif ─────────────────────────────────────────────

async function mapToUser(row: typeof users.$inferSelect): Promise<User> {
  const assignmentRows = await db
    .select()
    .from(userAssignments)
    .where(eq(userAssignments.userId, row.id));

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    avatarUrl: row.avatarUrl ?? undefined,
    assignments: assignmentRows.map((a) => ({
      projectId: a.projectId,
      assignmentType: a.assignmentType,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getUsers(orgId?: string): Promise<User[]> {
  // Sans orgId, on ne retourne rien pour éviter la fuite cross-tenant
  if (!orgId) return [];
  const rows = await db.select().from(users).where(eq(users.organizationId, orgId));
  return Promise.all(rows.map(mapToUser));
}

export async function getUserById(userId: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows.length > 0 ? mapToUser(rows[0]) : null;
}

/**
 * Crée un utilisateur dans Supabase Auth ET dans notre table PostgreSQL.
 */
const PLAN_USER_LIMITS: Record<string, number | null> = {
  TRIAL: null,      // illimité pendant l'essai
  STARTER: 5,
  PRO: null,        // illimité
  ENTERPRISE: null, // illimité
};

export async function addUser(
  userData: { displayName: string; email: string; role: UserRole },
  password?: string,
  orgId?: string | null
): Promise<string> {
  await requireRole(['ADMIN']);
  if (!password) throw new Error("Le mot de passe est requis pour créer un nouvel utilisateur.");

  // Vérifier la limite d'utilisateurs selon le plan
  if (orgId) {
    const orgRows = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
    const org = orgRows[0];
    if (org) {
      const limit = PLAN_USER_LIMITS[org.plan];
      if (limit !== null) {
        const [{ value: currentCount }] = await db
          .select({ value: count() })
          .from(users)
          .where(eq(users.organizationId, orgId));
        if (Number(currentCount) >= limit) {
          throw new Error(`Limite atteinte : le plan ${org.plan} autorise ${limit} utilisateurs maximum. Passez au plan Pro pour des utilisateurs illimités.`);
        }
      }
    }
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: userData.email,
    password,
    user_metadata: { full_name: userData.displayName },
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already been registered')) {
      throw new Error("Cette adresse e-mail est déjà utilisée par un autre compte.");
    }
    throw new Error(error.message);
  }

  const uid = data.user.id;

  await db.insert(users).values({
    id: uid,
    email: userData.email,
    name: userData.displayName,
    role: userData.role,
    avatarUrl: null,
    organizationId: orgId ?? null,
  });

  return uid;
}

/**
 * Met à jour le nom, rôle ou avatar d'un utilisateur.
 */
export async function updateUser(
  userId: string,
  data: { name?: string; role?: UserRole; avatarUrl?: string | null }
): Promise<User | null> {
  if (Object.keys(data).length === 0) return getUserById(userId);

  await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return getUserById(userId);
}

function isProjectActive(project: { status: string; endDate?: string }): boolean {
  if (project.status !== 'ACTIVE') return false;
  if (!project.endDate) return true;
  return new Date(project.endDate) >= new Date();
}

/**
 * Met à jour les assignations de projet d'un utilisateur.
 */
export async function updateUserAssignments(
  userId: string,
  newAssignments: UserAssignment[]
): Promise<void> {
  await requireRole(['ADMIN', 'SUPERVISOR']);
  const oldAssignmentRows = await db
    .select()
    .from(userAssignments)
    .where(eq(userAssignments.userId, userId));
  const oldAssignments: UserAssignment[] = oldAssignmentRows.map((a) => ({
    projectId: a.projectId,
    assignmentType: a.assignmentType,
  }));

  const fullTimeNew = newAssignments.filter((a) => a.assignmentType === 'FULL_TIME');
  if (fullTimeNew.length > 1) {
    const activeCount = await Promise.all(
      fullTimeNew.map(async (a) => {
        const p = await getProjectById(a.projectId);
        return p && isProjectActive(p) ? a.projectId : null;
      })
    );
    const activeIds = activeCount.filter(Boolean);
    if (activeIds.length > 1) {
      throw new Error(
        `Le technicien ne peut pas être assigné à TEMPS PLEIN à plusieurs projets actifs simultanément. Projets en conflit : ${activeIds.join(', ')}.`
      );
    }
  }

  await db.delete(userAssignments).where(eq(userAssignments.userId, userId));

  if (newAssignments.length > 0) {
    await db.insert(userAssignments).values(
      newAssignments.map((a) => ({
        userId,
        projectId: a.projectId,
        assignmentType: a.assignmentType,
      }))
    );
  }

  const oldProjectIds = new Set(oldAssignments.map((a) => a.projectId));
  for (const assignment of newAssignments) {
    if (!oldProjectIds.has(assignment.projectId)) {
      const project = await getProjectById(assignment.projectId);
      if (project) {
        const typeDisplay = assignment.assignmentType === 'FULL_TIME' ? 'à temps plein' : 'à temps partiel';
        await addNotification(userId, {
          type: 'project_assignment',
          message: `Vous avez été assigné(e) ${typeDisplay} au projet : ${project.name} (Lieu: ${project.location}).`,
          targetId: project.id,
          link: '/my-projects',
        });
      }
    }
  }
}

/**
 * Supprime le record utilisateur de PostgreSQL.
 */
export async function deleteUserFirestoreRecord(userId: string): Promise<void> {
  await requireRole(['ADMIN']);
  await db.delete(users).where(eq(users.id, userId));
}
