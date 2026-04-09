import { db } from '@/db';
import { timeEntries, users } from '@/db/schema';
import { eq, and, gte, lte, sum, desc } from 'drizzle-orm';

export async function createTimeEntry(data: {
  userId: string;
  projectId: string;
  reportId?: string;
  date: Date;
  durationMinutes: number;
  notes?: string;
  organizationId: string;
}) {
  const [entry] = await db
    .insert(timeEntries)
    .values({ ...data, durationMinutes: String(data.durationMinutes) })
    .returning();
  return entry;
}

export async function getTimeEntriesByProject(projectId: string, orgId: string) {
  return db
    .select({
      id: timeEntries.id,
      userId: timeEntries.userId,
      userName: users.name,
      date: timeEntries.date,
      durationMinutes: timeEntries.durationMinutes,
      notes: timeEntries.notes,
      reportId: timeEntries.reportId,
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(and(eq(timeEntries.projectId, projectId), eq(timeEntries.organizationId, orgId)))
    .orderBy(desc(timeEntries.date));
}

export async function getTotalHoursByUser(userId: string, orgId: string, from?: Date, to?: Date) {
  const conditions = [eq(timeEntries.userId, userId), eq(timeEntries.organizationId, orgId)];
  if (from) conditions.push(gte(timeEntries.date, from));
  if (to) conditions.push(lte(timeEntries.date, to));

  const result = await db
    .select({ total: sum(timeEntries.durationMinutes) })
    .from(timeEntries)
    .where(and(...conditions));

  const totalMinutes = Number(result[0]?.total ?? 0);
  return Math.round(totalMinutes / 60 * 10) / 10;
}

export async function getHoursByUserPerProject(orgId: string) {
  return db
    .select({
      userId: timeEntries.userId,
      userName: users.name,
      projectId: timeEntries.projectId,
      totalMinutes: sum(timeEntries.durationMinutes),
    })
    .from(timeEntries)
    .leftJoin(users, eq(timeEntries.userId, users.id))
    .where(eq(timeEntries.organizationId, orgId))
    .groupBy(timeEntries.userId, users.name, timeEntries.projectId);
}
