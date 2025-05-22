
// src/ai/flows/generate-verification-code.ts
'use server';

/**
 * @fileOverview Generates a verification code and sends it to the user via Telegram.
 *
 * - generateVerificationCode - A function that handles the verification code generation and sending process.
 * - GenerateVerificationCodeInput - The input type for the generateVerificationCode function.
 * - GenerateVerificationCodeOutput - The return type for the generateVerificationCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateVerificationCodeInputSchema = z.object({
  phoneNumber: z.string().describe('The phone number to send the verification code to.'),
});
export type GenerateVerificationCodeInput = z.infer<typeof GenerateVerificationCodeInputSchema>;

const GenerateVerificationCodeOutputSchema = z.object({
  success: z.boolean().describe('Whether the verification code was sent successfully.'),
  message: z.string().describe('A message indicating the status of the verification code sending process.'),
});
export type GenerateVerificationCodeOutput = z.infer<typeof GenerateVerificationCodeOutputSchema>;

export async function generateVerificationCode(
  input: GenerateVerificationCodeInput
): Promise<GenerateVerificationCodeOutput> {
  return generateVerificationCodeFlow(input);
}

const sendTelegramMessage = ai.defineTool(
  {
    name: 'sendTelegramMessage',
    description: 'Sends a message to a Telegram user via bot.',
    inputSchema: z.object({
      phoneNumber: z.string().describe('The phone number of the user.'),
      message: z.string().describe('The message to send to the user.'),
    }),
    outputSchema: z.boolean(),
  },
  async (input) => {
    // Placeholder implementation for sending Telegram message
    // In a real application, this would use the Telegram Bot API to send the message
    console.log(`Sending Telegram message to ${input.phoneNumber}: ${input.message}`);
    return true; // Assume success for now
  }
);

const generateVerificationCodePrompt = ai.definePrompt({
  name: 'generateVerificationCodePrompt',
  tools: [sendTelegramMessage],
  input: {schema: GenerateVerificationCodeInputSchema},
  output: {schema: GenerateVerificationCodeOutputSchema},
  prompt: `You are tasked with generating a verification code and sending it to the user via Telegram.

  Generate a random 6-digit verification code. Then, use the sendTelegramMessage tool to send the code to the user's phone number.

  Phone Number: {{{phoneNumber}}}

  Respond to the user with a success message if the code was sent successfully, or an error message if there was an issue.
  `,
});

const generateVerificationCodeFlow = ai.defineFlow(
  {
    name: 'generateVerificationCodeFlow',
    inputSchema: GenerateVerificationCodeInputSchema,
    outputSchema: GenerateVerificationCodeOutputSchema,
  },
  async input => {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `Your verification code is: ${verificationCode}`;

    try {
      // Attempt to send the Telegram message using the tool
      const success = await sendTelegramMessage({
        phoneNumber: input.phoneNumber,
        message: message,
      });

      if (success) {
        return {success: true, message: 'Verification code sent successfully.'};
      } else {
        return {success: false, message: 'Failed to send verification code.'};
      }
    } catch (error) {
      console.error('Error sending verification code:', error);
      return {success: false, message: 'An error occurred while sending the verification code.'};
    }
  }
);
