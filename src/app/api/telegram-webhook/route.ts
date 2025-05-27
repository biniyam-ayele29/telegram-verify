
// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";
import { 
    getVerificationAttemptById, 
    updateVerificationAttempt,
    storeBotSession,
    getBotSessionByChatId,
    deleteBotSession,
    findVerifiedAttemptByPhoneAndChatId // New import
} from "@/lib/firestore-operations";
import { type TelegramBotSession, FullPhoneNumberSchema } from "@/lib/verification-shared"; // Added FullPhoneNumberSchema

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

console.log("[Webhook Module] Initializing telegram-webhook route module...");
console.log(`[Webhook Module] TELEGRAM_BOT_TOKEN is ${token ? "SET" : "NOT SET"}`);
console.log(`[Webhook Module] NEXT_PUBLIC_APP_URL is: ${appUrl}`);

// Initialize bot - this will only create an instance, actual polling/webhook connection is managed by Telegram.
const bot = token ? new TelegramBot(token) : ({} as TelegramBot); // Type assertion for conditional init

if (token) {
  console.log("[Webhook Module] Telegram bot instance potentially initialized.");

  // Handler for /start VERIFY_{pendingId} command
  // Example: /start VERIFY_123e4567-e89b-12d3-a456-426614174000
  bot.onText(/\/start VERIFY_([a-zA-Z0-9-]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const pendingIdFromPayload = match ? match[1] : null;

    console.log(`[Webhook] Received /start command with VERIFY_ payload. Chat ID: ${chatId}, Pending ID: ${pendingIdFromPayload}`);

    if (!pendingIdFromPayload) {
      console.warn(`[Webhook] /start VERIFY_ command for chat ${chatId} but no pendingId payload found.`);
      bot.sendMessage(chatId, "Welcome! It looks like the verification link was incomplete. Please use the complete link from our website.");
      return;
    }

    try {
      const currentAttempt = await getVerificationAttemptById(pendingIdFromPayload);

      if (!currentAttempt) {
        console.warn(`[Webhook] No current verification attempt found for pendingId ${pendingIdFromPayload} (chatId ${chatId}).`);
        bot.sendMessage(chatId, "This verification link is invalid or has expired. Please start over from the website.");
        return;
      }

      console.log(`[Webhook] Current attempt ${pendingIdFromPayload} for ${currentAttempt.websitePhoneNumber} (status: ${currentAttempt.status}, expires: ${new Date(currentAttempt.expiresAt).toISOString()})`);

      if (currentAttempt.status !== 'pending') {
          let messageForUser = "This verification link has already been processed or is no longer valid.";
          if (currentAttempt.status === 'code_sent' && currentAttempt.telegramChatId === chatId) {
               messageForUser = `You've already requested a code for this session. It is: ${currentAttempt.code}. Please enter this on the website.`;
          } else if (currentAttempt.status === 'verified') {
              messageForUser = `This verification is already complete for phone number ${currentAttempt.websitePhoneNumber}.`;
          }
          bot.sendMessage(chatId, messageForUser);
          return;
      }
      
      if (Date.now() > currentAttempt.expiresAt) {
        console.warn(`[Webhook] Verification attempt ${pendingIdFromPayload} for chatId ${chatId} has expired.`);
        await updateVerificationAttempt(pendingIdFromPayload, { status: 'expired', updatedAt: Date.now() });
        bot.sendMessage(chatId, "This verification link has expired. Please request a new one from the website.");
        return;
      }

      // Check if this chatId has previously verified this phone number
      const previouslyVerifiedAttempt = await findVerifiedAttemptByPhoneAndChatId(
        currentAttempt.websitePhoneNumber,
        chatId
      );

      if (previouslyVerifiedAttempt) {
        console.log(`[Webhook] ChatId ${chatId} has previously verified phone ${currentAttempt.websitePhoneNumber}. Skipping contact share for current pendingId ${pendingIdFromPayload}.`);
        // Skip contact sharing, directly update currentAttempt and send its code
        await updateVerificationAttempt(pendingIdFromPayload, {
            telegramChatId: chatId,
            telegramPhoneNumber: previouslyVerifiedAttempt.telegramPhoneNumber || currentAttempt.websitePhoneNumber, // Use previously verified phone if available
            status: 'code_sent',
            updatedAt: Date.now()
        });
        bot.sendMessage(chatId, `Welcome back! Your verification code for ${currentAttempt.websitePhoneNumber} is: ${currentAttempt.code}\n\nPlease enter this code on the website.`);
        console.log(`[Webhook] Sent OTP ${currentAttempt.code} to returning chatId ${chatId} for ${currentAttempt.websitePhoneNumber} (pendingId ${pendingIdFromPayload}).`);
      } else {
        // Proceed with contact sharing flow
        console.log(`[Webhook] ChatId ${chatId} has NOT previously verified ${currentAttempt.websitePhoneNumber} (or no record found). Requesting contact share for pendingId ${pendingIdFromPayload}.`);
        
        const botSession: TelegramBotSession = {
            chatId: chatId,
            pendingVerificationId: pendingIdFromPayload,
            createdAt: Date.now()
        };
        await storeBotSession(botSession);
        console.log(`[Webhook] Stored bot session for chatId ${chatId} linked to pendingId ${pendingIdFromPayload.substring(0,8)}...`);

        const replyMarkup = {
          keyboard: [[{ text: "Share Contact", request_contact: true }]],
          one_time_keyboard: true,
          resize_keyboard: true,
        };
        bot.sendMessage(chatId, "Please share your contact information to proceed with verification:", {
          // @ts-ignore // node-telegram-bot-api types might not be perfectly aligned with Telegram's API for reply_markup
          reply_markup: replyMarkup,
        });
        console.log(`[Webhook] Sent 'Share Contact' button to chatId ${chatId} for pendingId ${pendingIdFromPayload.substring(0,8)}...`);
        // Optionally update status for currentAttempt if needed, e.g., to 'contact_requested'
        // await updateVerificationAttempt(pendingIdFromPayload, { status: 'contact_requested', updatedAt: Date.now() });
      }
    } catch (error: any) {
      console.error(`[Webhook] Error processing /start VERIFY_${pendingIdFromPayload} for chatId ${chatId}:`, error.message || error);
      bot.sendMessage(chatId, "Sorry, an error occurred while initiating verification. Please try clicking the link from the website again or contact support.");
    }
  });

  // Handler for when user shares contact
  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const telegramPhoneNumber = msg.contact?.phone_number;

    console.log(`[Webhook] Received contact from chatId ${chatId}. Telegram Phone: ${telegramPhoneNumber}`);

    if (!telegramPhoneNumber) {
      console.warn(`[Webhook] Contact received from chatId ${chatId} but phone number is missing.`);
      bot.sendMessage(chatId, "Could not get your phone number from the shared contact. Please try again.");
      return;
    }
    
    // Ensure telegramPhoneNumber starts with '+' if it doesn't (Telegram usually provides it in E.164)
    const formattedTelegramPhone = telegramPhoneNumber.startsWith('+') ? telegramPhoneNumber : `+${telegramPhoneNumber}`;

    try {
      const botSession = await getBotSessionByChatId(chatId);
      if (!botSession) {
        console.warn(`[Webhook] No active bot session found for chatId ${chatId} upon receiving contact.`);
        bot.sendMessage(chatId, "Your session for sharing contact was not found. Please restart the process from the website by clicking the link again.");
        return;
      }

      const { pendingVerificationId } = botSession;
      console.log(`[Webhook] Retrieved bot session for chatId ${chatId}, associated pendingId: ${pendingVerificationId.substring(0,8)}...`);

      const attempt = await getVerificationAttemptById(pendingVerificationId);
      if (!attempt) {
        console.warn(`[Webhook] No verification attempt found for pendingId ${pendingVerificationId} (from chatId ${chatId}).`);
        bot.sendMessage(chatId, "Your verification request was not found. It might have expired. Please start over on the website.");
        await deleteBotSession(chatId); // Clean up session
        return;
      }

      console.log(`[Webhook] Verification attempt ${pendingVerificationId} details: Website Phone: ${attempt.websitePhoneNumber}, Status: ${attempt.status}`);

      // Status should ideally be 'pending' or 'contact_requested'
      if (attempt.status !== 'pending' && attempt.status !== 'contact_requested') {
          let messageForUser = "This verification request cannot be processed (status: " + attempt.status + ").";
          if (attempt.status === 'code_sent' && attempt.telegramChatId === chatId) {
               messageForUser = `A code has already been sent for your number ${attempt.websitePhoneNumber}. It is: ${attempt.code}. Please enter this on the website.`;
          } else if (attempt.status === 'verified') {
              messageForUser = `Your number ${attempt.websitePhoneNumber} is already verified.`;
          }
          bot.sendMessage(chatId, messageForUser);
          await deleteBotSession(chatId);
          return;
      }
      
      if (Date.now() > attempt.expiresAt) {
        console.warn(`[Webhook] Verification attempt ${pendingVerificationId} for chatId ${chatId} has expired.`);
        await updateVerificationAttempt(pendingVerificationId, { status: 'expired', updatedAt: Date.now() });
        bot.sendMessage(chatId, "Sorry, your verification request has expired. Please try starting the process again on our website.");
        await deleteBotSession(chatId);
        return;
      }

      // Compare phone numbers
      if (formattedTelegramPhone === attempt.websitePhoneNumber) {
        console.log(`[Webhook] Phone numbers match for pendingId ${pendingVerificationId}! Website: ${attempt.websitePhoneNumber}, Telegram: ${formattedTelegramPhone}.`);
        await updateVerificationAttempt(pendingVerificationId, { 
          telegramChatId: chatId, 
          telegramPhoneNumber: formattedTelegramPhone,
          status: 'code_sent',
          updatedAt: Date.now()
        });
        bot.sendMessage(chatId, `Your verification code for ${attempt.websitePhoneNumber} is: ${attempt.code}\n\nPlease enter this code on the website.`);
        console.log(`[Webhook] Sent OTP ${attempt.code} to chatId ${chatId} for ${attempt.websitePhoneNumber}.`);
      } else {
        console.warn(`[Webhook] Phone number mismatch for pendingId ${pendingVerificationId}. Website: ${attempt.websitePhoneNumber}, Telegram: ${formattedTelegramPhone}.`);
        await updateVerificationAttempt(pendingVerificationId, {
          telegramPhoneNumber: formattedTelegramPhone, // Store the mismatched number for audit
          status: 'phone_mismatch',
          updatedAt: Date.now()
        });
        bot.sendMessage(chatId, `The phone number you shared (${formattedTelegramPhone}) does not match the number registered on the website (${attempt.websitePhoneNumber}). Please ensure you initiated this process for the correct number or start over on the website.`);
      }
      await deleteBotSession(chatId); // Clean up session after processing

    } catch (error: any) {
      console.error(`[Webhook] Error processing contact for chatId ${chatId}:`, error.message || error);
      bot.sendMessage(chatId, "Sorry, an error occurred while processing your shared contact. Please try again or contact support.");
      try { await deleteBotSession(chatId); } catch (e) { /* ignore cleanup error */ }
    }
  });

  // Generic /start handler if no payload or different payload
  bot.onText(/\/start$/, (msg) => {
     const chatId = msg.chat.id;
     console.log(`[Webhook] Received generic /start command (no VERIFY_ payload) from chat ID: ${chatId}`);
     bot.sendMessage(chatId, "Welcome to TeleVerify! To verify your phone number for a website, please initiate the process from that website. You will then be given a specific link to click which will bring you back here to receive your code.");
  });


  bot.on("polling_error", (error: any) => {
    console.error(
      "[Webhook] Telegram Bot Polling Error (should not occur with webhooks):",
      error.code || "unknown",
      error.message || error
    );
  });

  bot.on("webhook_error", (error: any) => {
    console.error(
      "[Webhook] Telegram Bot Webhook Error:",
      error.code || "unknown",
      error.message || error
    );
  });
  console.log("[Webhook Module] Telegram bot command handlers potentially registered.");
} else {
  console.warn(
    "[Webhook Module] Telegram bot not initialized because token is missing. Webhook will not process commands."
  );
}

export async function POST(request: NextRequest) {
  console.log("[Webhook] Received POST request on /api/telegram-webhook");
  if (!token) {
    console.error(
      "[Webhook] CRITICAL: TELEGRAM_BOT_TOKEN is not set. Cannot process webhook update."
    );
    return NextResponse.json(
      { status: "error", message: "Bot token not configured on server" },
      { status: 500 }
    );
  }

  try {
    const update = await request.json();
    console.log(
      "[Webhook] Raw update received:",
      JSON.stringify(update, null, 2)
    );
     if (update.message) {
      console.log("[Webhook] Message details:", {
        chatId: update.message.chat?.id,
        text: update.message.text,
        from: update.message.from?.username || update.message.from?.id,
        isBot: update.message.from?.is_bot,
        date: new Date(update.message.date * 1000).toISOString(),
        contact: update.message.contact // Log contact info if present
      });
    }

    bot.processUpdate(update);
    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error(
      "[Webhook] Error processing Telegram update in POST handler:",
      error.message || error
    );
    if (error instanceof SyntaxError) {
      console.error(
        "[Webhook] SyntaxError processing update. Request body might not be valid JSON."
      );
    }
    return NextResponse.json(
      { status: "error", message: "Failed to process update" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  console.log(
    "[Webhook] Received GET request on /api/telegram-webhook (typically for health check or initial setup)."
  );
  if (!token) {
    return NextResponse.json(
      {
        message:
          "Telegram webhook is active, but bot token is NOT configured on the server.",
      },
      { status: 500 }
    );
  }
  return NextResponse.json({
    message:
      "Telegram webhook is active and bot token seems to be configured. Use POST for updates from Telegram.",
  });
}
