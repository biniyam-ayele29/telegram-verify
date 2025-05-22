// src/lib/actions.ts
"use server";

import { z } from "zod";
import { generateVerificationCode } from "@/ai/flows/generate-verification-code"; // Ensure this path is correct

interface VerificationAttempt {
  phoneNumber: string;
  code: string; // The dummy code we expect for verification
  expiresAt: number;
  attemptsRemaining: number;
}

// In-memory store for verification attempts. In a real app, use a database or Redis.
const verificationStore = new Map<string, VerificationAttempt>();

const CODE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;
const DUMMY_VERIFICATION_CODE = "123456"; // The code the user will be hinted to use

const PhoneNumberSchema = z.string()
  .min(10, "Invalid phone number length.")
  .max(15, "Invalid phone number length.")
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format. Include country code e.g. +1234567890");

export async function sendCodeAction(prevState: any, formData: FormData) {
  const phoneNumber = formData.get("phoneNumber") as string;

  const validation = PhoneNumberSchema.safeParse(phoneNumber);
  if (!validation.success) {
    return { success: false, message: validation.error.errors[0].message, field: "phoneNumber" };
  }

  try {
    // Call the AI flow to send a code via Telegram (actual code sent by AI is unknown to this backend)
    const aiResponse = await generateVerificationCode({ phoneNumber });

    if (aiResponse.success) {
      // Store details for our DUMMY verification process
      verificationStore.set(phoneNumber, {
        phoneNumber,
        code: DUMMY_VERIFICATION_CODE,
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
      });
      return {
        success: true,
        message: `Verification code sent to ${phoneNumber} via Telegram. (For demo purposes, use code: ${DUMMY_VERIFICATION_CODE})`,
      };
    } else {
      return { success: false, message: aiResponse.message || "Failed to send verification code." };
    }
  } catch (error) {
    console.error("Error in sendCodeAction:", error);
    return { success: false, message: "An unexpected error occurred while sending the code." };
  }
}

const VerificationCodeSchema = z.string()
  .length(6, "Verification code must be 6 digits.")
  .regex(/^\d{6}$/, "Verification code must be numeric.");

export async function verifyCodeAction(prevState: any, formData: FormData) {
  const phoneNumber = formData.get("phoneNumber") as string;
  const submittedCode = formData.get("verificationCode") as string;

  const phoneValidation = PhoneNumberSchema.safeParse(phoneNumber);
  if (!phoneValidation.success) {
    return { success: false, message: "Invalid phone number." , field: "phoneNumber"};
  }

  const codeValidation = VerificationCodeSchema.safeParse(submittedCode);
  if (!codeValidation.success) {
    return { success: false, message: codeValidation.error.errors[0].message, field: "verificationCode" };
  }

  const attempt = verificationStore.get(phoneNumber);

  if (!attempt) {
    return { success: false, message: "No verification attempt found for this phone number, or it has expired. Please request a new code." };
  }

  if (Date.now() > attempt.expiresAt) {
    verificationStore.delete(phoneNumber); // Clean up expired entry
    return { success: false, message: "Verification code has expired. Please request a new code." };
  }

  if (attempt.attemptsRemaining <= 0) {
    return { success: false, message: "No attempts remaining. Please request a new code." };
  }

  if (submittedCode === attempt.code) {
    verificationStore.delete(phoneNumber); // Successful verification, remove entry
    return { success: true, message: "Phone number verified successfully!" };
  } else {
    attempt.attemptsRemaining -= 1;
    verificationStore.set(phoneNumber, attempt); // Update attempts
    return {
      success: false,
      message: `Invalid verification code. ${attempt.attemptsRemaining} attempts remaining.`,
    };
  }
}
