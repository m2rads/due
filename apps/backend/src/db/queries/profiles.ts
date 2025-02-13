import { eq } from 'drizzle-orm';
import { db } from '../index';
import { profiles, type InsertProfile } from '../schema/profiles';

export async function getProfileById(id: string) {
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function createProfile(profile: InsertProfile) {
  await db.insert(profiles).values(profile);
  return getProfileById(profile.id);
}

export async function updateProfile(id: string, data: Partial<InsertProfile>) {
  await db
    .update(profiles)
    .set({ ...data, updated_at: new Date() })
    .where(eq(profiles.id, id));
  
  return getProfileById(id);
}

export async function deleteProfile(id: string) {
  await db
    .delete(profiles)
    .where(eq(profiles.id, id));
}
