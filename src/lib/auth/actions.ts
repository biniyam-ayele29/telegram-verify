
// src/lib/auth/actions.ts
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebase-admin';
import { verifyPassword, generateToken } from './utils';
import { AUTH_COOKIE_NAME, ADMIN_USERS_COLLECTION } from './config';
import type { AdminUserDocument, AdminAuthFormState } from './types';

const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function loginAdminAction(
  prevState: AdminAuthFormState,
  formData: FormData
): Promise<AdminAuthFormState> {
  const validatedFields = LoginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Invalid input.',
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validatedFields.data;

  try {
    const userQuery = await adminDb
      .collection(ADMIN_USERS_COLLECTION)
      .where('username', '==', username)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return { success: false, message: 'Invalid username or password.' };
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data() as AdminUserDocument;

    const passwordMatch = await verifyPassword(password, userData.hashedPassword);
    if (!passwordMatch) {
      return { success: false, message: 'Invalid username or password.' };
    }

    const tokenPayload = { userId: userDoc.id, username: userData.username };
    const token = generateToken(tokenPayload);

    cookies().set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hour, should match JWT_EXPIRATION
    });
    
    // Instead of returning redirectTo, we call redirect directly
    // This is the standard way for Server Actions to navigate after success
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
  
  redirect('/admin'); // redirect here after setting cookie
}

export async function logoutAdminAction(): Promise<void> {
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/admin/login');
}
