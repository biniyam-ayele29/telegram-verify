
// src/lib/actions.ts
"use server";

import { generateVerificationCode } from "@/ai/flows/generate-verification-code";
import type { GenerateVerificationCodeOutput } from "@/ai/flows/generate-verification-code";
import {
  FullPhoneNumberSchema,
} from "./verification-shared";
import {
  storeVerificationCode,
  getVerificationCode,
  updateVerificationCode,
  deleteVerificationCode,
} from "./firestore-operations"; // Corrected import names
import { CODE_EXPIRATION_MS, MAX_VERIFICATION_ATTEMPTS } from "./verification-shared";
import { getClientApplicationByClientId } from "./client-actions"; // Import client action

// ActionFormState remains here as it's specific to the actions
export interface ActionFormState {
  success: boolean;
  message: string;
  field?: string;
  redirectUrl?: string; // For navigation between steps in TeleVerify
  toastMessage?: string;
  finalRedirectUrl?: string; // For redirecting back to the client app
}

export async function sendCodeAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  console.log("[sendCodeAction] Starting code generation process...");

  const countryCode = (formData.get("countryCode") as string) ?? "";
  const localPhoneNumber = (formData.get("localPhoneNumber") as string) ?? "";

  if (!countryCode || !localPhoneNumber) {
    console.error("[sendCodeAction] Missing phone number components");
    return {
      success: false,
      message: "Phone number components are missing.",
      field: !countryCode ? "countryCode" : "localPhoneNumber",
      toastMessage: "Please provide both country code and phone number.",
    };
  }

  const fullPhoneNumber = `${countryCode}${localPhoneNumber}`;
  console.log(`[sendCodeAction] Processing phone number: ${fullPhoneNumber}`);

  const validationResult = FullPhoneNumberSchema.safeParse(fullPhoneNumber);
  if (!validationResult.success) {
    console.error(
      `[sendCodeAction] Invalid phone number format: ${fullPhoneNumber}. Error: ${validationResult.error.errors[0].message}`
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
      await generateVerificationCode({ fullPhoneNumber });
    console.log(
      `[sendCodeAction] AI response for ${fullPhoneNumber}:`,
      JSON.stringify(aiResponse)
    );

    if (aiResponse.success && aiResponse.verificationCode) {
      const storedCodeData = {
        fullPhoneNumber,
        code: aiResponse.verificationCode,
        expiresAt: Date.now() + CODE_EXPIRATION_MS,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS,
        telegramChatId: -1,
      };

      await storeVerificationCode(fullPhoneNumber, storedCodeData); // Corrected function call
      console.log(
        `[sendCodeAction] Stored verification data for ${fullPhoneNumber} in Firestore. Code: ${aiResponse.verificationCode}`
      );

      return {
        success: true,
        message: "Verification code generated. Redirecting user.",
        toastMessage:
          "Code ready! Go to our Telegram bot, type /receive, then send your phone number.",
        redirectUrl: `/verify-telegram?phone=${encodeURIComponent(
          fullPhoneNumber
        )}`,
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
  const fullPhoneNumber = (formData.get("fullPhoneNumber") as string) ?? "";
  const clientId = (formData.get("clientId") as string) ?? ""; // Get clientId from form

  if (!verificationCode || !fullPhoneNumber) {
    return {
      success: false,
      message: "Missing verification code or phone number.",
      field: !verificationCode ? "verificationCode" : undefined,
      toastMessage: "Please provide both verification code and phone number.",
    };
  }
   if (!clientId) {
    // This case should ideally not happen if form is set up correctly
    return {
      success: false,
      message: "Client ID is missing. Cannot proceed with final redirection.",
      toastMessage: "An error occurred (missing client identifier).",
    };
  }


  try {
    const storedData = await getVerificationCode(fullPhoneNumber); // Corrected function call

    if (!storedData) {
      return {
        success: false,
        message: "No verification code found for this phone number. It might have expired or not been requested.",
        field: "verificationCode",
        toastMessage: "Please request a new verification code.",
      };
    }

    if (storedData.attemptsRemaining <= 0) {
      await deleteVerificationCode(fullPhoneNumber); // Corrected function call
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
        field: "verificationCode",
        toastMessage: "Too many failed attempts. Please request a new code.",
      };
    }

    if (Date.now() > storedData.expiresAt) {
      await deleteVerificationCode(fullPhoneNumber); // Corrected function call
      return {
        success: false,
        message: "Verification code has expired.",
        field: "verificationCode",
        toastMessage: "Code has expired. Please request a new one.",
      };
    }

    if (verificationCode !== storedData.code) {
      await updateVerificationCode(fullPhoneNumber, { // Corrected function call
        attemptsRemaining: storedData.attemptsRemaining - 1,
      });

      return {
        success: false,
        message: "Invalid verification code.",
        field: "verificationCode",
        toastMessage: `Invalid code. ${
          storedData.attemptsRemaining - 1
        } attempts remaining.`,
      };
    }

    // Code is valid
    await deleteVerificationCode(fullPhoneNumber); // Corrected function call, clean up used code

    // Fetch client application to get redirect URI
    const clientApp = await getClientApplicationByClientId(clientId);
    let finalRedirectUrl: string | undefined = undefined;

    if (clientApp && clientApp.status === 'active' && clientApp.redirectUris && clientApp.redirectUris.length > 0) {
      finalRedirectUrl = clientApp.redirectUris[0]; // Use the first registered URI
      console.log(`[verifyCodeAction] Successfully verified. Client: ${clientApp.companyName}. Redirecting to: ${finalRedirectUrl}`);
    } else {
      console.warn(`[verifyCodeAction] Client app not found, inactive, or no redirect URIs for clientId: ${clientId}. Cannot perform final redirect.`);
      // User is verified with TeleVerify, but we can't redirect them back to client.
      // They will just see the success message on TeleVerify page.
    }

    return {
      success: true,
      message: "Phone number verified successfully! You will be redirected shortly.",
      toastMessage: "Phone number verified successfully! Redirecting...",
      finalRedirectUrl: finalRedirectUrl,
    };
  } catch (error: any) {
    console.error(
      `[verifyCodeAction] Error verifying code for ${fullPhoneNumber}:`,
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
