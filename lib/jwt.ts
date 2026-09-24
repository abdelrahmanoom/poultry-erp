import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-change-in-prod';
const JWT_EXPIRY = '7d';

export interface JWTClaims {
  tenant_id: number;
  user_id: number;
  username: string;
}

export function signTenantJWT(claims: JWTClaims): string {
  return jwt.sign(
    { ...claims, role: 'authenticated' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyTenantJWT(token: string): JWTClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTClaims;
  } catch {
    return null;
  }
}

export function getJWTFromCookie(cookieHeader: string | null): JWTClaims | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/tenant_jwt=([^;]+)/);
  if (!match) return null;
  return verifyTenantJWT(decodeURIComponent(match[1]));
}
