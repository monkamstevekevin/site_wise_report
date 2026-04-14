import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadOrgLogo } from '@/services/storageService';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = currentUser.organizationId;
  const { imageDataURI } = await request.json();
  if (!imageDataURI) return NextResponse.json({ error: 'imageDataURI required' }, { status: 400 });

  // Get current logo to delete old one
  const [org] = await db.select({ logoUrl: organizations.logoUrl }).from(organizations).where(eq(organizations.id, orgId));

  const logoUrl = await uploadOrgLogo(orgId, imageDataURI, org?.logoUrl);

  await db.update(organizations)
    .set({ logoUrl, updatedAt: new Date() })
    .where(eq(organizations.id, orgId));

  return NextResponse.json({ logoUrl });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId || currentUser.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db.update(organizations)
    .set({ logoUrl: null, updatedAt: new Date() })
    .where(eq(organizations.id, currentUser.organizationId));

  return NextResponse.json({ ok: true });
}
