
// src/lib/actions.ts
"use server";

import { z } from "zod";
import { generateVerificationCode } from "@/ai/flows/generate-verification-code";

interface VerificationAttempt {
  fullPhoneNumber: string;
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

const verificationStore = new Map<string, VerificationAttempt>();

const CODE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
const MAX_VERIFICATION_ATTEMPTS = 3;
const DUMMY_VERIFICATION_CODE = "123456";

// Schema for individual parts, used by the form
const PartialPhoneSchema = z.object({
  countryCode: z.string()
    .min(2, "Country code too short (e.g. +1)")
    .max(4, "Country code too long (e.g. +999)")
    .regex(/^\+\d{1,3}$/, "Invalid country code format. Must start with + (e.g., +1, +44)"),
  localPhoneNumber: z.string()
    .min(7, "Local phone number is too short.")
    .max(14, "Local phone number is too long.")
    .regex(/^\d+$/, "Local phone number must contain only digits."),
});

// Schema for the combined full phone number, used for AI flow and internal validation
const FullPhoneNumberSchema = z.string()
  .min(8, "Full phone number is too short.") // e.g. +1 followed by 7 digits
  .max(18, "Full phone number is too long.") // e.g. +999 followed by 14 digits
  .regex(/^\+\d{8,17}$/, "Invalid full phone number format. Should be country code + local number.");


export async function sendCodeAction(prevState: any, formData: FormData) {
  const countryCode = formData.get("countryCode") as string;
  const localPhoneNumber = formData.get("localPhoneNumber") as string;

  const partialValidation = PartialPhoneSchema.safeParse({ countryCode, localPhoneNumber });
  if (!partialValidation.success) {
    const firstError = partialValidation.error.errors[0];
    const field = firstError.path.includes("countryCode") ? "countryCode" : "localPhoneNumber";
    return { success: false, message: firstError.message, field };
  }

  const fullPhoneNumber = countryCode + localPhoneNumber;
  
  const fullValidation = FullPhoneNumberSchema.safeParse(fullPhoneNumber);
  if(!fullValidation.success) {
    return { success: false, message: "Invalid combined phone number. " + fullValidation.error.errors[0].message, field: "fullPhoneNumber" };
  }

  try {
    const aiResponse = await generateVerificationCode({ fullPhoneNumber });

    if (aiResponse.success) {
      verificationStore.set(fullPhoneNumber, {
        fullPhoneNumber,
        code: DUMMY_VERIFICATION_CODE,
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
      });
      return {
        success: true,
        message: `Verification code sent to ${fullPhoneNumber} via Telegram. (For demo, use code: ${DUMMY_VERIFICATION_CODE})`,
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
  const countryCode = formData.get("countryCode") as string;
  const localPhoneNumber = formData.get("localPhoneNumber") as string;
  const submittedCode = formData.get("verificationCode") as string;

  // It's good practice to validate inputs even if they come from component state
  const partialValidation = PartialPhoneSchema.safeParse({ countryCode, localPhoneNumber });
   if (!partialValidation.success) {
    return { success: false, message: "Invalid phone number parts received." , field: "phoneNumber"}; // Generic field name
  }
  const fullPhoneNumber = countryCode + localPhoneNumber;


  const codeValidation = VerificationCodeSchema.safeParse(submittedCode);
  if (!codeValidation.success) {
    return { success: false, message: codeValidation.error.errors[0].message, field: "verificationCode" };
  }

  const attempt = verificationStore.get(fullPhoneNumber);

  if (!attempt) {
    return { success: false, message: "No verification attempt found for this phone number, or it has expired. Please request a new code." };
  }

  if (Date.now() > attempt.expiresAt) {
    verificationStore.delete(fullPhoneNumber);
    return { success: false, message: "Verification code has expired. Please request a new code." };
  }

  if (attempt.attemptsRemaining <= 0) {
    return { success: false, message: "No attempts remaining. Please request a new code." };
  }

  if (submittedCode === attempt.code) {
    verificationStore.delete(fullPhoneNumber);
    return { success: true, message: "Phone number verified successfully!" };
  } else {
    attempt.attemptsRemaining -= 1;
    verificationStore.set(fullPhoneNumber, attempt);
    return {
      success: false,
      message: `Invalid verification code. ${attempt.attemptsRemaining} attempts remaining.`,
      field: "verificationCode",
    };
  }
}

    