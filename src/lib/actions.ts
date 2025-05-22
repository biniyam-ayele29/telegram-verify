
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
const DUMMY_VERIFICATION_CODE = "123456"; // Keep using this for demo purposes

// Schema for individual parts, used by the form
const PartialPhoneSchema = z.object({
  countryCode: z.string()
    .min(2, "Country code selection is required.")
    .max(5, "Country code is too long.") // e.g. +268 for Eswatini
    .regex(/^\+\d{1,4}$/, "Invalid country code format."), // Allow 1 to 4 digits after +
  localPhoneNumber: z.string()
    .min(7, "Local phone number is too short.")
    .max(14, "Local phone number is too long.")
    .regex(/^\d+$/, "Local phone number must contain only digits."),
});

// Schema for the combined full phone number, used for AI flow and internal validation
const FullPhoneNumberSchema = z.string()
  .min(8, "Full phone number is too short.") // e.g. +1 followed by 7 digits
  .max(19, "Full phone number is too long.") // e.g. +XXX followed by 14 digits
  .regex(/^\+\d{8,18}$/, "Invalid full phone number format. Should be country code + local number.");


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
    // For demo purposes, we directly proceed to store the dummy code
    // In a real app, the AI flow would actually send the code.
    // const aiResponse = await generateVerificationCode({ fullPhoneNumber });

    // if (aiResponse.success) { // Assuming direct success for demo
      verificationStore.set(fullPhoneNumber, {
        fullPhoneNumber,
        code: DUMMY_VERIFICATION_CODE, // Use the dummy code
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
      });
      return {
        success: true,
        // The message from AI would confirm actual sending, here we simulate
        message: `Verification code sent to ${fullPhoneNumber} via Telegram. (For demo, use code: ${DUMMY_VERIFICATION_CODE})`,
      };
    // } else {
    //   return { success: false, message: aiResponse.message || "Failed to send verification code via AI." };
    // }
  } catch (error) {
    console.error("Error in sendCodeAction:", error);
    // return { success: false, message: "An unexpected error occurred while sending the code." };
     // Simulating Genkit error for robustness, if the call were to be made
    return { success: false, message: "Failed to communicate with Genkit service for sending code." };
  }
}

const VerificationCodeSchema = z.string()
  .length(6, "Verification code must be 6 digits.")
  .regex(/^\d{6}$/, "Verification code must be numeric.");

export async function verifyCodeAction(prevState: any, formData: FormData) {
  const countryCode = formData.get("countryCode") as string;
  const localPhoneNumber = formData.get("localPhoneNumber") as string;
  const submittedCode = formData.get("verificationCode") as string;

  const partialValidation = PartialPhoneSchema.safeParse({ countryCode, localPhoneNumber });
   if (!partialValidation.success) {
    return { success: false, message: "Invalid phone number parts received." , field: "phoneNumber"};
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
    verificationStore.delete(fullPhoneNumber); // Also clear if no attempts left
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
