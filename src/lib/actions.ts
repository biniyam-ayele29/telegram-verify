
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
  console.log("[sendCodeAction] Received form data:", Object.fromEntries(formData.entries()));
  const countryCode = (formData.get("countryCode") as string | null) ?? "";
  const localPhoneNumber = (formData.get("localPhoneNumber") as string | null) ?? "";

  const partialValidation = PartialPhoneSchema.safeParse({ countryCode, localPhoneNumber });
  if (!partialValidation.success) {
    const firstError = partialValidation.error.errors[0];
    const field = firstError.path.includes("countryCode") ? "countryCode" : "localPhoneNumber";
    console.error("[sendCodeAction] Partial phone validation failed:", firstError.message, "for field:", field);
    return { success: false, message: firstError.message, field };
  }

  const fullPhoneNumberInput = countryCode + localPhoneNumber;

  const fullValidation = FullPhoneNumberSchema.safeParse(fullPhoneNumberInput);
  if(!fullValidation.success) {
    const errorMessage = "Invalid combined phone number: " + fullValidation.error.errors[0].message;
    console.error("[sendCodeAction] Full phone validation failed:", errorMessage);
    return { success: false, message: errorMessage, field: "localPhoneNumber" };
  }
  const fullPhoneNumber = fullValidation.data; // Use the validated data as the key

  console.log(`[sendCodeAction] Attempting to generate code for: ${fullPhoneNumber}`);
  try {
    const aiResponse: GenerateVerificationCodeOutput = await generateVerificationCode({ fullPhoneNumber });
    console.log(`[sendCodeAction] AI response for ${fullPhoneNumber}:`, JSON.stringify(aiResponse));

    if (aiResponse.success && aiResponse.verificationCode) {
      const storedCodeData = {
        fullPhoneNumber,
        code: aiResponse.verificationCode,
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
      };
      verificationStore.set(fullPhoneNumber, storedCodeData);
      console.log(`[sendCodeAction] Stored verification data for ${fullPhoneNumber}. Code: ${aiResponse.verificationCode}. Store size: ${verificationStore.size}`);
      // Log current store contents for debugging (can be noisy)
      // console.log("[sendCodeAction] Current verificationStore contents:", Object.fromEntries(verificationStore.entries()));


      return {
        success: true,
        message: "Verification code generated. Redirecting user.", // Internal message
        toastMessage: "Code ready! Go to our Telegram bot, type /receive, then your phone number.", // Message for the user
        redirectUrl: `/verify-telegram?phone=${encodeURIComponent(fullPhoneNumber)}`,
      };

    } else {
      console.error(`[sendCodeAction] Failed to generate verification code for ${fullPhoneNumber}. AI Response: ${aiResponse.message}`);
      return {
        success: false,
        message: aiResponse.message || "Failed to generate verification code.",
        field: "localPhoneNumber", // Or a more general error field
        toastMessage: aiResponse.message || "Could not prepare verification. Please try again."
      };
    }
  } catch (error) {
    console.error(`[sendCodeAction] Error calling Genkit flow for ${fullPhoneNumber}:`, error);
    let errorMessage = "An unexpected error occurred while preparing verification.";
    if (error instanceof Error) {
        console.error("[sendCodeAction] Genkit flow error details:", error.message);
    }
    return {
        success: false,
        message: errorMessage,
        field: "localPhoneNumber",
        toastMessage: "An unexpected error occurred. Please try again."
    };
  }
}


export async function verifyCodeAction(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
  const fullPhoneNumberInput = (formData.get("fullPhoneNumber") as string | null) ?? "";
  const submittedCode = (formData.get("verificationCode") as string | null) ?? "";
  console.log(`[verifyCodeAction] Attempting to verify code for phone: ${fullPhoneNumberInput}, code: ${submittedCode}`);


   if (!fullPhoneNumberInput) {
    console.error("[verifyCodeAction] Phone number not provided.");
    return { success: false, message: "Phone number not provided for verification.", field: "verificationCode" };
  }
   const fullValidation = FullPhoneNumberSchema.safeParse(fullPhoneNumberInput);
   if(!fullValidation.success) {
     const errorMessage = "Invalid phone number format provided for verification: " + fullValidation.error.errors[0].message;
     console.error("[verifyCodeAction]", errorMessage);
     return { success: false, message: errorMessage, field: "verificationCode" };
   }
   const fullPhoneNumber = fullValidation.data;


  const codeValidation = VerificationCodeSchema.safeParse(submittedCode);
  if (!codeValidation.success) {
    console.error("[verifyCodeAction] Invalid code format:", codeValidation.error.errors[0].message);
    return { success: false, message: codeValidation.error.errors[0].message, field: "verificationCode" };
  }

  const attempt = verificationStore.get(fullPhoneNumber);
  console.log(`[verifyCodeAction] Retrieved attempt for ${fullPhoneNumber} from store:`, attempt ? JSON.stringify(attempt) : 'Not found');


  if (!attempt) {
    console.warn(`[verifyCodeAction] No verification attempt found or expired for ${fullPhoneNumber}. Store size: ${verificationStore.size}`);
    return { success: false, message: "No verification attempt found for this phone number, or it has expired. Please request a new code.", field: "verificationCode" };
  }

  if (Date.now() > attempt.expiresAt) {
    console.warn(`[verifyCodeAction] Verification code expired for ${fullPhoneNumber}. Expired at: ${new Date(attempt.expiresAt).toISOString()}`);
    verificationStore.delete(fullPhoneNumber);
    return { success: false, message: "Verification code has expired. Please request a new code.", field: "verificationCode" };
  }

  if (attempt.attemptsRemaining <= 0) {
    console.warn(`[verifyCodeAction] No attempts remaining for ${fullPhoneNumber}.`);
    return { success: false, message: "No attempts remaining. Please request a new code.", field: "verificationCode" };
  }

  if (submittedCode === attempt.code) {
    console.log(`[verifyCodeAction] Code verified successfully for ${fullPhoneNumber}.`);
    verificationStore.delete(fullPhoneNumber); // Clean up successful verification
    return { success: true, message: "Phone number verified successfully!" };
  } else {
    attempt.attemptsRemaining -= 1;
    verificationStore.set(fullPhoneNumber, attempt); // Update attempt count
    console.warn(`[verifyCodeAction] Invalid code for ${fullPhoneNumber}. Attempts remaining: ${attempt.attemptsRemaining}`);
    return {
      success: false,
      message: `Invalid verification code. ${attempt.attemptsRemaining} attempts remaining.`,
      field: "verificationCode",
    };
  }
}

