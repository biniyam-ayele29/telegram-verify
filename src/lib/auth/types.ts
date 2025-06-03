
// src/lib/auth/types.ts
export interface AdminUserDocument {
  id?: string;
  username: string;
  hashedPassword: string;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  // Add other relevant fields like roles if needed
}

export interface AdminAuthFormState {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
  redirectTo?: string;
}
