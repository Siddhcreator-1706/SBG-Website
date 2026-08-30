import jwt from 'jsonwebtoken';

const ALGORITHM: jwt.Algorithm = 'HS256';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('Missing JWT_SECRET');
  }
  return secret;
}

export function signUserToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    expiresIn: '7d',
    algorithm: ALGORITHM,
  });
}

export function verifyUserToken(token: string): { sub: string } {
  return jwt.verify(token, getJwtSecret(), { algorithms: [ALGORITHM] }) as { sub: string };
}
