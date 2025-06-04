// src/lib/auth/actions.ts
"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { verifyPassword, generateToken } from "./utils";
import { AUTH_COOKIE_NAME, ADMIN_USERS_COLLECTION } from "./config";
import type { AdminUserDocument, AdminAuthFormState } from "./types";
import { LoginSchema } from "./schema";

export async function loginAdminAction(
  prevState: AdminAuthFormState,
  formData: FormData
): Promise<AdminAuthFormState> {
  const validatedFields = LoginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return { success: false, message: "Invalid username or password." };
  }

  const { username, password } = validatedFields.data;

  try {
    const userQuery = await adminDb
      .collection(ADMIN_USERS_COLLECTION)
      .where("username", "==", username)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return { success: false, message: "Invalid username or password." };
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data() as AdminUserDocument;

    const passwordMatch = await verifyPassword(
      password,
      userData.hashedPassword
    );
    if (!passwordMatch) {
      return { success: false, message: "Invalid username or password." };
    }

    const tokenPayload = { userId: userDoc.id, username: userData.username };
<<<<<<< HEAD
    const token = await generateToken(tokenPayload); // Added await here
=======
    const token = await generateToken(tokenPayload);
>>>>>>> 3ef663a12afa73725f5a5004f2df72b2df94e90e

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour, should match JWT_EXPIRATION
    });
<<<<<<< HEAD
    
=======
>>>>>>> 3ef663a12afa73725f5a5004f2df72b2df94e90e
  } catch (error) {
    console.error("Login error:", error);
    return {
      success: false,
      message: "An unexpected error occurred. Please try again.",
    };
  }
<<<<<<< HEAD
  
  redirect('/admin'); 
=======

  redirect("/admin");
>>>>>>> 3ef663a12afa73725f5a5004f2df72b2df94e90e
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/admin/login");
}
