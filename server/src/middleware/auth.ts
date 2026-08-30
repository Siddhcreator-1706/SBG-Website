import type { NextFunction, Request, Response } from 'express';
import { db } from '../db';
import { verifyUserToken } from '../utils/jwt';

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || '';
    const mockEmail = req.headers['x-mock-user-email'];

    // Mock login is opt-in and never available in production.
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.ENABLE_MOCK_AUTH === 'true' &&
      typeof mockEmail === 'string' &&
      mockEmail
    ) {
      const { rows } = await db.query(
        'SELECT id, role, email FROM profiles WHERE email = $1 LIMIT 1',
        [mockEmail]
      );
      const profile = rows[0];

      if (!profile) {
        return res
          .status(401)
          .json({ error: `Mock user not found for email: ${mockEmail}` });
      }

      req.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
      };
      return next();
    }

    const token = req.cookies?.jwt_token || (authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null);

    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    let decoded: { sub: string };
    try {
      decoded = verifyUserToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = decoded.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token payload structure' });
    }

    const { rows } = await db.query(
      'SELECT role, email FROM profiles WHERE id = $1 LIMIT 1',
      [userId]
    );
    const profile = rows[0];

    if (!profile) {
      console.error('Profile not found for user:', userId);
      return res.status(401).json({ error: 'User profile does not exist' });
    }

    req.user = {
      id: userId,
      email: profile.email,
      role: profile.role,
    };

    return next();
  } catch (err) {
    return res.status(401).json({ error: `Unauthorized: ${(err as Error).message}` });
  }
};

export default authMiddleware;
