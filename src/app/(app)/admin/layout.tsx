import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Layout serveur pour toutes les pages /admin.
 * Redirige immédiatement les non-ADMIN vers /dashboard,
 * avant même que le JavaScript client ne se charge.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/auth/login');
  }

  const rows = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (rows.length === 0 || rows[0].role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
