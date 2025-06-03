// src/lib/auth/utils.ts
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { JWT_SECRET_KEY, JWT_EXPIRATION } from "./config";
import type { JWTPayload } from "./types";

const SALT_ROUNDS = 10;
const textEncoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = new Uint8Array(textEncoder.encode(JWT_SECRET_KEY));
  const alg = "HS256";

  // Convert our payload to a jose-compatible format
  const josePayload: jose.JWTPayload = {
    ...payload,
    // Add any standard claims if needed
    iat: Math.floor(Date.now() / 1000),
  };

  return new jose.SignJWT(josePayload)
    .setProtectedHeader({ alg })
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new Uint8Array(textEncoder.encode(JWT_SECRET_KEY));
    const { payload } = await jose.jwtVerify(token, secret);

    // Validate that the payload has the required fields
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string"
    ) {
      console.error("JWT payload missing required fields");
      return null;
    }

    // Convert jose payload to our JWTPayload type
    const customPayload: JWTPayload = {
      userId: payload.userId,
      username: payload.username,
    };

    return customPayload;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}
