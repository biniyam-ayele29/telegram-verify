
// src/ai/flows/generate-verification-code.ts
'use server';

/**
 * @fileOverview Generates a verification code.
 * The user will be directed to a Telegram bot to retrieve this code.
 *
 * - generateVerificationCode - A function that handles the verification code generation.
 * - GenerateVerificationCodeInput - The input type for the generateVerificationCode function.
 * - GenerateVerificationCodeOutput - The return type for the generateVerificationCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVerificationCodeInputSchema = z.object({
  fullPhoneNumber: z.string().describe('The full phone number, including country code (e.g., +1234567890). This is for logging/association.'),
});
export type GenerateVerificationCodeInput = z.infer<typeof GenerateVerificationCodeInputSchema>;

const GenerateVerificationCodeOutputSchema = z.object({
  success: z.boolean().describe('Whether the verification code was generated successfully.'),
  message: z.string().describe('A message indicating the status of the code generation.'),
  verificationCode: z.string().optional().describe('The generated 6-digit verification code, if successful.'),
});
export type GenerateVerificationCodeOutput = z.infer<typeof GenerateVerificationCodeOutputSchema>;

export async function generateVerificationCode(
  input: GenerateVerificationCodeInput
): Promise<GenerateVerificationCodeOutput> {
  return generateVerificationCodeFlow(input);
}

const generateVerificationCodeFlow = ai.defineFlow(
  {
    name: 'generateVerificationCodeFlow',
    inputSchema: GenerateVerificationCodeInputSchema,
    outputSchema: GenerateVerificationCodeOutputSchema,
  },
  async (input) => {
    try {
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`Generated verification code ${verificationCode} for phone: ${input.fullPhoneNumber}`);

      // The bot token and chat ID are no longer used here for sending.
      // The user will be directed to the bot.
      // Your bot's logic (separate from this app) will handle showing the code.

      return {
        success: true,
        message: `Verification code generated for ${input.fullPhoneNumber}. User should be directed to Telegram bot.`,
        verificationCode: verificationCode,
      };
    } catch (error: any) {
      console.error('Error in generateVerificationCodeFlow:', error);
      return {
        success: false,
        message: `Failed to generate verification code for ${input.fullPhoneNumber}: ${error.message || 'Unknown error'}.`,
        verificationCode: undefined,
      };
    }
  }
);
