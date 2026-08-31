import { db } from '../db';
import NodeCache from 'node-cache';

const profileCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

export const getAuthProfile = async (userId: string): Promise<{ role: 'admin' | 'club'; email: string } | null> => {
  const cached = profileCache.get<{ role: 'admin' | 'club'; email: string }>(userId);
  if (cached) return cached;

  const { rows } = await db.query(
    'SELECT role, email FROM profiles WHERE id = $1 LIMIT 1',
    [userId]
  );
  const profile = rows[0];

  if (profile) {
    profileCache.set(userId, profile);
    return profile;
  }
  return null;
};
