
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
  fullPhoneNumber: z.string().describe('The full phone number, including country code, to send the verification code to (e.g., +1234567890).'),
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
      phoneNumber: z.string().describe('The full phone number of the user, including country code.'),
      message: z.string().describe('The message to send to the user.'),
    }),
    outputSchema: z.boolean(),
  },
  async (input) => {
    // Placeholder implementation for sending Telegram message
    // In a real application, this would use the Telegram Bot API to send the message
    console.log(`Sending Telegram message to ${input.phoneNumber}: ${input.message}`);
    // Simulate potential failure for demonstration, e.g., if Telegram API call failed
    // For this demo, we'll assume it succeeds if it reaches here.
    // if (Math.random() < 0.1) return false; // Simulate 10% failure rate
    return true;
  }
);

const generateVerificationCodePrompt = ai.definePrompt({
  name: 'generateVerificationCodePrompt',
  tools: [sendTelegramMessage],
  input: {schema: GenerateVerificationCodeInputSchema},
  output: {schema: GenerateVerificationCodeOutputSchema},
  prompt: `You are tasked with generating a verification code and sending it to the user via Telegram.

  Generate a random 6-digit verification code. Then, use the sendTelegramMessage tool to send the code to the user's phone number.

  Phone Number: {{{fullPhoneNumber}}}

  Respond to the user with a success message if the code was sent successfully, or an error message if there was an issue.
  `,
});

const generateVerificationCodeFlow = ai.defineFlow(
  {
    name: 'generateVerificationCodeFlow',
    inputSchema: GenerateVerificationCodeInputSchema,
    outputSchema: GenerateVerificationCodeOutputSchema,
  },
  async (input) => {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `Your verification code is: ${verificationCode}`;

    try {
      const success = await sendTelegramMessage({
        phoneNumber: input.fullPhoneNumber, // Use fullPhoneNumber from input
        message: message,
      });

      if (success) {
        return {success: true, message: 'Verification code sent successfully via Telegram.'};
      } else {
        // This part might be less likely to be hit if the tool itself doesn't return false explicitly
        // or if an error isn't thrown by the tool. The LLM's response based on the tool's output
        // might be more relevant if the tool returns a structured response.
        // However, for a simple boolean success from the tool:
        return {success: false, message: 'The sendTelegramMessage tool reported failure.'};
      }
    } catch (error) {
      console.error('Error in generateVerificationCodeFlow calling sendTelegramMessage:', error);
      // This catches errors from the tool execution itself (e.g., network issues, unhandled exceptions in tool)
      return {success: false, message: 'An error occurred while trying to send the verification code via Telegram.'};
    }
  }
);

    