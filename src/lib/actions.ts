
// src/lib/actions.ts
"use server";

import { generateVerificationCode } from "@/ai/flows/generate-verification-code";
import type { GenerateVerificationCodeOutput } from "@/ai/flows/generate-verification-code";
import {
  verificationStore,
  CODE_EXPIRATION_MS,
  MAX_VERIFICATION_ATTEMPTS,
  PartialPhoneSchema,
  FullPhoneNumberSchema,
  VerificationCodeSchema
} from "./verification-shared"; // Import from the new shared file

// ActionFormState remains here as it's specific to the actions
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
    // The Genkit flow now only generates the code, doesn't send Telegram message.
    const aiResponse: GenerateVerificationCodeOutput = await generateVerificationCode({ fullPhoneNumber });

    if (aiResponse.success && aiResponse.verificationCode) {
      verificationStore.set(fullPhoneNumber, {
        fullPhoneNumber,
        code: aiResponse.verificationCode,
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
      });
      console.log(`Stored code ${aiResponse.verificationCode} for ${fullPhoneNumber}`);

      return {
        success: true,
        message: "Verification code generated. Redirecting user.", // Internal message
        toastMessage: "Code ready! Please open our Telegram bot to get your verification code.", // Message for the user
        redirectUrl: `/verify-telegram?phone=${encodeURIComponent(fullPhoneNumber)}`,
      };

    } else {
      return {
        success: false,
        message: aiResponse.message || "Failed to generate verification code.",
        field: "localPhoneNumber", // Or a more general error field
        toastMessage: aiResponse.message || "Could not prepare verification. Please try again."
      };
    }
  } catch (error) {
    console.error("Error in sendCodeAction calling Genkit flow:", error);
    // Provide a user-friendly message, log the actual error for debugging
    let errorMessage = "An unexpected error occurred while preparing verification.";
    if (error instanceof Error) {
        // Potentially add more specific error checking here if needed
        console.error("Genkit flow error details:", error.message);
    }
    return {
        success: false,
        message: errorMessage,
        field: "localPhoneNumber", // Or a general form error
        toastMessage: "An unexpected error occurred. Please try again."
    };
  }
}


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
