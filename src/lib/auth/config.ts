// src/lib/auth/config.ts
// Ensure process.env.JWT_SECRET_KEY is a non-empty string, otherwise use fallback.
const envSecretKey = process.env.JWT_SECRET_KEY;
export const JWT_SECRET_KEY = (envSecretKey && envSecretKey.trim() !== '')
  ? envSecretKey.trim() // Use .trim() here as well to remove potential surrounding whitespace
  : 'fallback-secret-key-for-dev-only-change-this';

if (process.env.NODE_ENV === 'production' && JWT_SECRET_KEY === 'fallback-secret-key-for-dev-only-change-this') {
  console.warn(
    'WARNING: JWT_SECRET_KEY is using a default fallback in production. ' +
    'This is insecure. Please set a strong, unique JWT_SECRET_KEY in your environment variables.'
  );
}

export const AUTH_COOKIE_NAME = 'admin-auth-token';
export const JWT_EXPIRATION = '1h'; // Token expiration time (e.g., 1 hour)
export const ADMIN_USERS_COLLECTION = 'adminUsers';
