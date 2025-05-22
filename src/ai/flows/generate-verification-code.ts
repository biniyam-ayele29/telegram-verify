
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
  fullPhoneNumber: z.string().describe('The full phone number, including country code (e.g., +1234567890). This is for logging/association, not directly used for sending if TELEGRAM_TARGET_CHAT_ID is set.'),
});
export type GenerateVerificationCodeInput = z.infer<typeof GenerateVerificationCodeInputSchema>;

const GenerateVerificationCodeOutputSchema = z.object({
  success: z.boolean().describe('Whether the verification code was generated and sending was attempted.'),
  message: z.string().describe('A message indicating the status of the process.'),
  verificationCode: z.string().optional().describe('The generated 6-digit verification code, if successful.'),
});
export type GenerateVerificationCodeOutput = z.infer<typeof GenerateVerificationCodeOutputSchema>;

export async function generateVerificationCode(
  input: GenerateVerificationCodeInput
): Promise<GenerateVerificationCodeOutput> {
  return generateVerificationCodeFlow(input);
}

const sendTelegramMessageTool = ai.defineTool(
  {
    name: 'sendTelegramMessageTool',
    description: 'Sends a message to a specific Telegram chat via bot HTTP API.',
    inputSchema: z.object({
      text: z.string().describe('The message text to send.'),
    }),
    outputSchema: z.object({
      sent: z.boolean(),
      details: z.string(),
    }),
  },
  async (input) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_TARGET_CHAT_ID;

    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN is not set in .env');
      return { sent: false, details: 'Telegram bot token not configured on server.' };
    }
    if (!chatId || chatId === "YOUR_TELEGRAM_CHAT_ID_HERE") {
      console.error('TELEGRAM_TARGET_CHAT_ID is not set or is placeholder in .env');
      return { sent: false, details: 'Telegram target chat ID not configured on server.' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: input.text,
          parse_mode: 'Markdown', // Optional: if you use markdown in your message
        }),
      });

      const result = await response.json();
      if (result.ok) {
        console.log(`Telegram message sent to chat_id ${chatId}`);
        return { sent: true, details: 'Message sent successfully via Telegram.' };
      } else {
        console.error('Failed to send Telegram message:', result);
        return { sent: false, details: `Telegram API error: ${result.description || 'Unknown error'}` };
      }
    } catch (error: any) {
      console.error('Error sending Telegram message:', error);
      return { sent: false, details: `Network or other error: ${error.message || 'Unknown error'}` };
    }
  }
);


const generateVerificationCodeFlow = ai.defineFlow(
  {
    name: 'generateVerificationCodeFlow',
    inputSchema: GenerateVerificationCodeInputSchema,
    outputSchema: GenerateVerificationCodeOutputSchema,
  },
  async (input) => {
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const messageText = `Your OTP is: *${verificationCode}*\nPlease enter this OTP on the website to verify.`;

    try {
      const sendResult = await sendTelegramMessageTool({ text: messageText });

      if (sendResult.sent) {
        return {
          success: true,
          message: `Verification code sent to Telegram. (Code: ${verificationCode} for phone: ${input.fullPhoneNumber})`,
          verificationCode: verificationCode,
        };
      } else {
        // Still return the code for manual verification if sending failed, but indicate the issue.
        return {
          success: false, // Or true, depending on whether code generation itself is the "success"
          message: `Generated code ${verificationCode} for ${input.fullPhoneNumber}. Telegram send failed: ${sendResult.details}`,
          verificationCode: verificationCode,
        };
      }
    } catch (error) {
      console.error('Error in generateVerificationCodeFlow calling sendTelegramMessageTool:', error);
      // Catch errors from the tool execution itself
      return {
        success: false,
        message: 'An error occurred while trying to send the verification code via Telegram.',
        // Optionally, still provide the code if generated before the error
        verificationCode: verificationCode, 
      };
    }
  }
);
