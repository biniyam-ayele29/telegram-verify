
// src/lib/verification-shared.ts
// This file does NOT use 'use server' and can export shared constants, types, and objects.

import { z } from "zod";

export interface VerificationAttempt {
  fullPhoneNumber: string;
  code: string;
  expiresAt: number;
  attemptsRemaining: number;
}

// In a real app, use a persistent store like Redis or a database.
export const verificationStore = new Map<string, VerificationAttempt>();

export const CODE_EXPIRATION_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_VERIFICATION_ATTEMPTS = 3;

// Schema for individual parts, used by the form
export const PartialPhoneSchema = z.object({
  countryCode: z.string()
    .min(1, "Please select a country code.")
    .max(5, "Country code is too long.")
    .regex(/^\+\d{1,4}$/, "Invalid country code format (e.g., +1)."),
  localPhoneNumber: z.string()
    .min(7, "Local phone number is too short.")
    .max(14, "Local phone number is too long.")
    .regex(/^\d+$/, "Local phone number must contain only digits."),
});

// Schema for the combined full phone number
export const FullPhoneNumberSchema = z.string()
  .min(8, "Full phone number is too short (country code + local number).")
  .max(19, "Full phone number is too long.")
  .regex(/^\+\d{8,18}$/, "Invalid full phone number format (e.g., +11234567890).");

// Schema for the verification code input
export const VerificationCodeSchema = z.string()
  .length(6, "Verification code must be 6 digits.")
  .regex(/^\d{6}$/, "Verification code must be numeric and 6 digits.");
