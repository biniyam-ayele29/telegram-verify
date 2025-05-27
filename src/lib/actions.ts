
// src/lib/actions.ts
"use server";

import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { generateVerificationCode } from "@/ai/flows/generate-verification-code";
import type { GenerateVerificationCodeOutput } from "@/ai/flows/generate-verification-code";
import {
  PartialPhoneSchema,
  FullPhoneNumberSchema,
  VerificationCodeSchema,
} from "./verification-shared"; // Import from the new shared file
import {
  storeVerificationAttempt,
  getVerificationAttemptById,
  updateVerificationAttempt,
  // deleteVerificationAttempt, // We might not delete immediately, just update status
} from "./firestore-operations";
import { CODE_EXPIRATION_MS, MAX_VERIFICATION_ATTEMPTS_ON_WEBSITE, type VerificationAttempt } from "./verification-shared";
import { getClientApplicationByClientId } from "./client-actions"; // Import client action


export interface ActionFormState {
  success: boolean;
  message: string;
  field?: string;
  redirectUrl?: string; // For navigation to /verify-telegram with pendingId
  toastMessage?: string;
  finalRedirectUrl?: string; // For redirecting back to the client app
  pendingId?: string; // To pass pendingVerificationId to the client
}

export async function sendCodeAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  console.log("[sendCodeAction] Starting code generation process...");

  const countryCode = (formData.get("countryCode") as string) ?? "";
  const localPhoneNumber = (formData.get("localPhoneNumber") as string) ?? "";
  const clientId = (formData.get("clientId") as string) ?? "";

  if (!clientId) {
     console.error("[sendCodeAction] Client ID is missing from form data.");
     return {
       success: false,
       message: "Client identifier is missing. Cannot proceed.",
       toastMessage: "An error occurred: Client ID missing.",
     };
  }

  const validatedPartialPhone = PartialPhoneSchema.safeParse({ countryCode, localPhoneNumber });
  if (!validatedPartialPhone.success) {
    const fieldErrors = validatedPartialPhone.error.flatten().fieldErrors;
    const firstErrorField = Object.keys(fieldErrors)[0] as keyof typeof fieldErrors;
    const firstErrorMessage = fieldErrors[firstErrorField]?.[0] || "Invalid phone input.";
     console.error(`[sendCodeAction] Invalid partial phone input: ${firstErrorMessage}`);
    return {
      success: false,
      message: firstErrorMessage,
      field: firstErrorField,
      toastMessage: "Please check your phone number.",
    };
  }

  const fullPhoneNumber = `${validatedPartialPhone.data.countryCode}${validatedPartialPhone.data.localPhoneNumber}`;
  console.log(`[sendCodeAction] Processing website phone number: ${fullPhoneNumber} for clientId: ${clientId}`);

  const validationResult = FullPhoneNumberSchema.safeParse(fullPhoneNumber);
  if (!validationResult.success) {
    console.error(
      `[sendCodeAction] Invalid full phone number format: ${fullPhoneNumber}. Error: ${validationResult.error.errors[0].message}`
    );
    return {
      success: false,
      message: validationResult.error.errors[0].message,
      field: "localPhoneNumber",
      toastMessage: "Please enter a valid phone number.",
    };
  }

  try {
    const aiResponse: GenerateVerificationCodeOutput =
      await generateVerificationCode({ fullPhoneNumber }); // Genkit flow still takes fullPhoneNumber
    console.log(
      `[sendCodeAction] AI response for ${fullPhoneNumber}:`,
      JSON.stringify(aiResponse)
    );

    if (aiResponse.success && aiResponse.verificationCode) {
      const pendingVerificationId = uuidv4();
      const now = Date.now();

      const newAttempt: VerificationAttempt = {
        id: pendingVerificationId,
        clientId: clientId,
        websitePhoneNumber: fullPhoneNumber,
        code: aiResponse.verificationCode,
        expiresAt: now + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS_ON_WEBSITE,
        telegramChatId: null, // Not yet linked to a Telegram chat
        status: 'pending',   // Initial status
        createdAt: now,
        updatedAt: now,
      };

      await storeVerificationAttempt(newAttempt);
      console.log(
        `[sendCodeAction] Stored verification attempt in Firestore with id: ${pendingVerificationId} for phone: ${fullPhoneNumber}`
      );

      return {
        success: true,
        message: "Verification process initiated. Redirecting user to get code via Telegram.",
        toastMessage: "Follow instructions on the next page to get your code via Telegram.",
        redirectUrl: `/verify-telegram?pendingId=${pendingVerificationId}`, // Pass pendingId
        pendingId: pendingVerificationId,
      };
    } else {
      console.error(
        `[sendCodeAction] Failed to generate verification code for ${fullPhoneNumber}. AI Response: ${aiResponse.message}`
      );
      return {
        success: false,
        message: aiResponse.message || "Failed to generate verification code.",
        field: "localPhoneNumber",
        toastMessage:
          aiResponse.message ||
          "Could not prepare verification. Please try again.",
      };
    }
  } catch (error: any) {
    console.error(
      `[sendCodeAction] Error in code generation process for ${fullPhoneNumber}:`,
      error.message || error
    );
    if (error.message?.includes("PERMISSION_DENIED")) {
        return {
            success: false,
            message: "Database permission error. Please check server logs and Firestore rules.",
            toastMessage: "A configuration error occurred. Please contact support.",
        };
    }
    return {
      success: false,
      message: `Error in code generation: ${error.message || "Unknown error"}`,
      field: "localPhoneNumber",
      toastMessage: "An unexpected error occurred while preparing verification.",
    };
  }
}

export async function verifyCodeAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const verificationCode = (formData.get("verificationCode") as string) ?? "";
  const pendingId = (formData.get("pendingId") as string) ?? ""; // Expect pendingId from the form

  console.log(`[verifyCodeAction] Verifying OTP: ${verificationCode} for pendingId: ${pendingId}`);

  if (!verificationCode || !pendingId) {
    return {
      success: false,
      message: "Missing verification code or identifier.",
      field: !verificationCode ? "verificationCode" : undefined,
      toastMessage: "Please provide the code and ensure the session is valid.",
    };
  }

  try {
    const attempt = await getVerificationAttemptById(pendingId);

    if (!attempt) {
      console.warn(`[verifyCodeAction] No verification attempt found for pendingId: ${pendingId}.`);
      return {
        success: false,
        message: "Verification session not found. It might have expired or is invalid.",
        field: "verificationCode",
        toastMessage: "Invalid session. Please start over.",
      };
    }

    if (attempt.status === 'verified') {
      console.warn(`[verifyCodeAction] Attempt ${pendingId} already verified for ${attempt.websitePhoneNumber}.`);
       const clientApp = await getClientApplicationByClientId(attempt.clientId);
       let finalRedirectUrl: string | undefined = undefined;
       if (clientApp && clientApp.status === 'active' && clientApp.redirectUris && clientApp.redirectUris.length > 0) {
           finalRedirectUrl = clientApp.redirectUris[0];
       }
      return {
        success: true,
        message: "Already verified. Redirecting...",
        toastMessage: "This number is already verified.",
        finalRedirectUrl: finalRedirectUrl,
      };
    }
    
    if (attempt.status !== 'code_sent') {
        console.warn(`[verifyCodeAction] Attempt ${pendingId} has status '${attempt.status}', expected 'code_sent'. Code might not have been delivered or phone numbers didn't match.`);
        let userMessage = "Verification process not in correct state. Please ensure you received code via Telegram.";
        if (attempt.status === 'phone_mismatch') {
            userMessage = "Phone number match failed. Please start over.";
        } else if (attempt.status === 'pending') {
            userMessage = "Verification process not yet completed in Telegram. Please ensure you shared your contact with the bot.";
        }
        return {
            success: false,
            message: userMessage,
            field: "verificationCode",
            toastMessage: userMessage,
        };
    }


    if (Date.now() > attempt.expiresAt) {
      await updateVerificationAttempt(pendingId, { status: 'expired', updatedAt: Date.now() });
      console.warn(`[verifyCodeAction] Code expired for pendingId: ${pendingId}`);
      return {
        success: false,
        message: "Verification code has expired.",
        field: "verificationCode",
        toastMessage: "Code has expired. Please request a new one.",
      };
    }

    if (attempt.attemptsRemaining <= 0) {
      await updateVerificationAttempt(pendingId, { status: 'failed_otp', updatedAt: Date.now() });
      console.warn(`[verifyCodeAction] No attempts remaining for pendingId: ${pendingId}`);
      return {
        success: false,
        message: "Too many failed attempts. Please start the process again.",
        field: "verificationCode",
        toastMessage: "No attempts left. Please start over.",
      };
    }

    if (verificationCode !== attempt.code) {
      const newAttemptsRemaining = attempt.attemptsRemaining - 1;
      await updateVerificationAttempt(pendingId, { attemptsRemaining: newAttemptsRemaining, updatedAt: Date.now() });
      console.warn(`[verifyCodeAction] Invalid code for pendingId: ${pendingId}. Attempts left: ${newAttemptsRemaining}`);
      return {
        success: false,
        message: "Invalid verification code.",
        field: "verificationCode",
        toastMessage: `Invalid code. ${newAttemptsRemaining} attempts remaining.`,
      };
    }

    // Code is valid
    await updateVerificationAttempt(pendingId, { status: 'verified', updatedAt: Date.now() });
    console.log(`[verifyCodeAction] Successfully verified OTP for pendingId: ${pendingId}. Phone: ${attempt.websitePhoneNumber}`);

    const clientApp = await getClientApplicationByClientId(attempt.clientId);
    let finalRedirectUrl: string | undefined = undefined;

    if (clientApp && clientApp.status === 'active' && clientApp.redirectUris && clientApp.redirectUris.length > 0) {
      finalRedirectUrl = clientApp.redirectUris[0]; 
      console.log(`[verifyCodeAction] Client: ${clientApp.companyName}. Redirecting to: ${finalRedirectUrl}`);
    } else {
      console.warn(`[verifyCodeAction] Client app not found, inactive, or no redirect URIs for clientId: ${attempt.clientId} on pendingId: ${pendingId}. Cannot perform final redirect.`);
    }

    return {
      success: true,
      message: "Phone number verified successfully! You will be redirected shortly.",
      toastMessage: "Phone number verified successfully! Redirecting...",
      finalRedirectUrl: finalRedirectUrl,
    };
  } catch (error: any) {
    console.error(
      `[verifyCodeAction] Error verifying code for pendingId ${pendingId}:`,
      error.message || error
    );
    return {
      success: false,
      message: `Error verifying code: ${error.message || "Unknown error"}`,
      field: "verificationCode",
      toastMessage: "An error occurred. Please try again.",
    };
  }
}
