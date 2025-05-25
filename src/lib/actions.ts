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
  VerificationCodeSchema,
} from "./verification-shared"; // Import from the new shared file
import {
  storeVerificationCode,
  getVerificationCode,
  updateVerificationCode,
  deleteVerificationCode,
} from "./firestore-operations";

// ActionFormState remains here as it's specific to the actions
export interface ActionFormState {
  success: boolean;
  message: string;
  field?: string;
  redirectUrl?: string;
  toastMessage?: string; // For messages to show in a toast, separate from form field messages
}

export async function sendCodeAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  console.log("[sendCodeAction] Starting code generation process...");

  const countryCode = formData.get("countryCode") as string;
  const localPhoneNumber = formData.get("localPhoneNumber") as string;

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
        telegramChatId: -1, // Initialize as -1 to indicate it hasn't been set yet
      };

      await storeVerificationCode(fullPhoneNumber, storedCodeData);
      console.log(
        `[sendCodeAction] Stored verification data for ${fullPhoneNumber}. Code: ${aiResponse.verificationCode}`
      );

      return {
        success: true,
        message: "Verification code generated. Redirecting user.", // Internal message
        toastMessage:
          "Code ready! Go to our Telegram bot, type /receive, then your phone number.", // Message for the user
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
        field: "localPhoneNumber", // Or a more general error field
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
      toastMessage: "An error occurred. Please try again.",
    };
  }
}

export async function verifyCodeAction(
  prevState: ActionFormState,
  formData: FormData
): Promise<ActionFormState> {
  const verificationCode = formData.get("verificationCode") as string;
  const fullPhoneNumber = formData.get("fullPhoneNumber") as string;

  if (!verificationCode || !fullPhoneNumber) {
    return {
      success: false,
      message: "Missing verification code or phone number.",
      field: !verificationCode ? "verificationCode" : undefined,
      toastMessage: "Please provide both verification code and phone number.",
    };
  }

  try {
    const storedData = await getVerificationCode(fullPhoneNumber);

    if (!storedData) {
      return {
        success: false,
        message: "No verification code found for this phone number.",
        field: "verificationCode",
        toastMessage: "Please request a new verification code.",
      };
    }

    if (storedData.attemptsRemaining <= 0) {
      await deleteVerificationCode(fullPhoneNumber);
      return {
        success: false,
        message: "Too many failed attempts. Please request a new code.",
        field: "verificationCode",
        toastMessage: "Too many failed attempts. Please request a new code.",
      };
    }

    if (Date.now() > storedData.expiresAt) {
      await deleteVerificationCode(fullPhoneNumber);
      return {
        success: false,
        message: "Verification code has expired.",
        field: "verificationCode",
        toastMessage: "Code has expired. Please request a new one.",
      };
    }

    if (verificationCode !== storedData.code) {
      await updateVerificationCode(fullPhoneNumber, {
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
    await deleteVerificationCode(fullPhoneNumber);
    return {
      success: true,
      message: "Phone number verified successfully!",
      toastMessage: "Your phone number has been verified successfully!",
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
