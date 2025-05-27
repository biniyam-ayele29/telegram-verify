
// src/lib/verification-shared.ts
import { z } from "zod";

// This interface defines the structure for a verification attempt document in Firestore.
// The document ID in Firestore will be the 'id' field (pendingVerificationId).
export interface VerificationAttempt {
  id: string; // The pendingVerificationId, also the Firestore document ID
  clientId: string; // Client App ID that initiated this request
  fullPhoneNumber: string;
  code: string;
  expiresAt: number; // Store as number (Unix timestamp in milliseconds)
  attemptsRemaining: number; // For OTP entry attempts on the website
  telegramChatId: number | null; // Telegram chat ID that claimed this code
  status: 'pending' | 'code_sent' | 'verified' | 'expired' | 'failed_too_many_attempts';
  createdAt: number; // Store as number (Unix timestamp in milliseconds)
  updatedAt?: number; // Store as number (Unix timestamp in milliseconds)
}

// Constants for verification
export const CODE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_VERIFICATION_ATTEMPTS_ON_WEBSITE = 3; // Max OTP entry attempts on website

// Schema for phone number validation (used by website form)
export const PartialPhoneSchema = z.object({
  countryCode: z
    .string()
    .min(1, "Please select a country code.")
    .max(5, "Country code is too long.")
    .regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +1)."),
  localPhoneNumber: z
    .string()
    .min(7, "Local phone number is too short.")
    .max(14, "Local phone number is too long.")
    .regex(/^\d+$/, "Local phone number must contain only digits."),
});

// Schema for full phone number validation (used internally)
export const FullPhoneNumberSchema = z
  .string()
  .min(10, "Phone number is too short.")
  .max(15, "Phone number is too long.")
  .regex(/^\+\d+$/, "Phone number must start with + followed by digits only.");

// Schema for the verification code input on the website
export const VerificationCodeSchema = z
  .string()
  .length(6, "Verification code must be 6 digits.")
  .regex(/^\d{6}$/, "Verification code must be numeric and 6 digits.");
