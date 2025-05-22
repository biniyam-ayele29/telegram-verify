
// src/lib/actions.ts
"use server";

import { z } from "zod";
import { generateVerificationCode } from "@/ai/flows/generate-verification-code";
import type { GenerateVerificationCodeOutput } from "@/ai/flows/generate-verification-code";


interface VerificationAttempt {
  fullPhoneNumber: string;
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

// In a real app, use a persistent store like Redis or a database.
const verificationStore = new Map<string, VerificationAttempt>();

const CODE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;

// Schema for individual parts, used by the form
const PartialPhoneSchema = z.object({
  countryCode: z.string()
    .min(1, "Please select a country code.") // Allow + and at least one digit
    .max(5, "Country code is too long.")
    .regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +1)."),
  localPhoneNumber: z.string()
    .min(7, "Local phone number is too short.")
    .max(14, "Local phone number is too long.")
    .regex(/^\d+$/, "Local phone number must contain only digits."),
});

// Schema for the combined full phone number
const FullPhoneNumberSchema = z.string()
  .min(8, "Full phone number is too short (country code + local number).")
  .max(19, "Full phone number is too long.")
  .regex(/^\+\d{8,18}$/, "Invalid full phone number format (e.g., +11234567890).");

export interface ActionFormState {
    success: boolean;
    message: string;
    field?: string;
    redirectUrl?: string;
    toastMessage?: string; // For messages to show in a toast, separate from form field messages
}


export async function sendCodeAction(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const countryCode = (formData.get("countryCode") as string | null) ?? "";
  const localPhoneNumber = (formData.get("localPhoneNumber") as string | null) ?? "";

  const partialValidation = PartialPhoneSchema.safeParse({ countryCode, localPhoneNumber });
  if (!partialValidation.success) {
    const firstError = partialValidation.error.errors[0];
    const field = firstError.path.includes("countryCode") ? "countryCode" : "localPhoneNumber";
    return { success: false, message: firstError.message, field };
  }

  const fullPhoneNumber = countryCode + localPhoneNumber;

  const fullValidation = FullPhoneNumberSchema.safeParse(fullPhoneNumber);
  if(!fullValidation.success) {
    return { success: false, message: "Invalid combined phone number: " + fullValidation.error.errors[0].message, field: "localPhoneNumber" };
  }

  try {
    const aiResponse: GenerateVerificationCodeOutput = await generateVerificationCode({ fullPhoneNumber });

    if (aiResponse.verificationCode) {
      verificationStore.set(fullPhoneNumber, {
        fullPhoneNumber,
        code: aiResponse.verificationCode,
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
      });

      // If AI reported an issue sending, but gave a code, we still proceed but inform user.
      // The 'success' here means the action to prepare for verification is done.
      return {
        success: true,
        message: "Redirection to verification step.", // Internal message for state
        toastMessage: aiResponse.message, // Message from AI to show user
        redirectUrl: `/verify-telegram?phone=${encodeURIComponent(fullPhoneNumber)}`,
      };

    } else {
      // AI flow failed to provide a code or indicated a critical failure
      return { success: false, message: aiResponse.message || "Failed to generate or send verification code.", field: "localPhoneNumber" };
    }
  } catch (error) {
    console.error("Error in sendCodeAction calling Genkit flow:", error);
    return { success: false, message: "An unexpected error occurred while trying to send the verification code." , field: "localPhoneNumber"};
  }
}

const VerificationCodeSchema = z.string()
  .length(6, "Verification code must be 6 digits.")
  .regex(/^\d{6}$/, "Verification code must be numeric and 6 digits.");

export async function verifyCodeAction(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const fullPhoneNumber = (formData.get("fullPhoneNumber") as string | null) ?? "";
  const submittedCode = (formData.get("verificationCode") as string | null) ?? "";

   if (!fullPhoneNumber) {
    return { success: false, message: "Phone number not provided for verification.", field: "verificationCode" };
  }

  const codeValidation = VerificationCodeSchema.safeParse(submittedCode);
  if (!codeValidation.success) {
    return { success: false, message: codeValidation.error.errors[0].message, field: "verificationCode" };
  }

  const attempt = verificationStore.get(fullPhoneNumber);

  if (!attempt) {
    return { success: false, message: "No verification attempt found for this phone number, or it has expired. Please request a new code.", field: "verificationCode" };
  }

  if (Date.now() > attempt.expiresAt) {
    verificationStore.delete(fullPhoneNumber);
    return { success: false, message: "Verification code has expired. Please request a new code.", field: "verificationCode" };
  }

  if (attempt.attemptsRemaining <= 0) {
    // Potentially keep the record for a bit for audit, but mark as exhausted
    // verificationStore.delete(fullPhoneNumber);
    return { success: false, message: "No attempts remaining. Please request a new code.", field: "verificationCode" };
  }

  if (submittedCode === attempt.code) {
    verificationStore.delete(fullPhoneNumber); // Clean up successful verification
    return { success: true, message: "Phone number verified successfully!" };
  } else {
    attempt.attemptsRemaining -= 1;
    verificationStore.set(fullPhoneNumber, attempt); // Update attempt count
    return {
      success: false,
      message: `Invalid verification code. ${attempt.attemptsRemaining} attempts remaining.`,
      field: "verificationCode",
    };
  }
}
