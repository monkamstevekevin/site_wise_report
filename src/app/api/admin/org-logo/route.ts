import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { db } from '@/db';
import { users, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { uploadOrgLogo, deleteProfileImage } from '@/services/storageService';

function extractStoragePath(publicUrl: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.substring(idx + marker.length));
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ logoDataUri: null }, { status: 401 });

  const [currentUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (!currentUser?.organizationId) return NextResponse.json({ logoDataUri: null });

  const [org] = await db.select({ logoUrl: organizations.logoUrl }).from(organizations).where(eq(organizations.id, currentUser.organizationId));
  if (!org?.logoUrl) return NextResponse.json({ logoDataUri: null });

  const path = extractStoragePath(org.logoUrl, 'avatars');
  if (!path) return NextResponse.json({ logoDataUri: null });

  const { data, error } = await supabaseAdmin.storage.from('avatars').download(path);
  if (error || !data) return NextResponse.json({ logoDataUri: null });

  const buffer = Buffer.from(await data.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = data.type || 'image/jpeg';

  return NextResponse.json({ logoDataUri: `data:${mimeType};base64,${base64}` });
}

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

  const [org] = await db.select({ logoUrl: organizations.logoUrl }).from(organizations).where(eq(organizations.id, currentUser.organizationId));
  if (org?.logoUrl) await deleteProfileImage(org.logoUrl);

  await db.update(organizations)
    .set({ logoUrl: null, updatedAt: new Date() })
    .where(eq(organizations.id, currentUser.organizationId));

  return NextResponse.json({ ok: true });
}
