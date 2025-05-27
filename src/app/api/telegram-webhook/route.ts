
// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";
import { getVerificationAttemptById, updateVerificationAttempt } from "@/lib/firestore-operations";
import { FullPhoneNumberSchema } from "@/lib/verification-shared"; // Keep for any potential direct phone inputs, though not primary flow now

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL; // For logging, not used for API calls within this file anymore

console.log("[Webhook Module] Initializing telegram-webhook route module...");

if (!token) {
  console.error(
    "[Webhook Module] CRITICAL: TELEGRAM_BOT_TOKEN is not defined in .env. The bot will not work."
  );
} else {
  console.log("[Webhook Module] TELEGRAM_BOT_TOKEN is set.");
}
if (!appUrl) {
  console.warn(
    "[Webhook Module] WARNING: NEXT_PUBLIC_APP_URL is not defined in .env. This might be okay if not used for self-API calls by bot."
  );
} else {
  console.log(`[Webhook Module] NEXT_PUBLIC_APP_URL is set to: ${appUrl}`);
}

const bot = token ? new TelegramBot(token) : ({} as TelegramBot);
if (token) {
  console.log("[Webhook Module] Telegram bot instance potentially initialized.");

  // Handler for /start KICKOFF_PENDING_ID command
  // Example: /start KICKOFF_123e4567-e89b-12d3-a456-426614174000
  bot.onText(/\/start KICKOFF_([a-zA-Z0-9-]+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const pendingId = match ? match[1] : null;

    console.log(`[Webhook] Received /start command with payload. Chat ID: ${chatId}, Pending ID from payload: ${pendingId}`);

    if (!pendingId) {
      console.warn(`[Webhook] /start command received for chat ${chatId} but no pendingId payload found.`);
      bot.sendMessage(chatId, "Welcome! If you're trying to verify, please use the link from our website.");
      return;
    }

    try {
      bot.sendMessage(chatId, `Processing your verification request (ID: ${pendingId.substring(0,8)})...`);
      const attempt = await getVerificationAttemptById(pendingId);

      if (!attempt) {
        console.warn(`[Webhook] No verification attempt found for pendingId: ${pendingId} (chatId: ${chatId})`);
        bot.sendMessage(chatId, "Sorry, your verification request was not found. It might have expired or is invalid. Please try starting the process again on our website.");
        return;
      }

      if (attempt.status !== 'pending') {
        console.warn(`[Webhook] Verification attempt ${pendingId} (chatId: ${chatId}) has status '${attempt.status}', expected 'pending'.`);
        if (attempt.status === 'code_sent' && attempt.telegramChatId === chatId) {
             bot.sendMessage(chatId, `A code has already been sent for your number ${attempt.fullPhoneNumber}. It is: ${attempt.code}. Please enter this on the website.`);
        } else if (attempt.status === 'verified') {
            bot.sendMessage(chatId, `Your number ${attempt.fullPhoneNumber} is already verified with us.`);
        } else {
            bot.sendMessage(chatId, "This verification request cannot be processed (status: " + attempt.status + "). Please try starting over on our website.");
        }
        return;
      }

      if (Date.now() > attempt.expiresAt) {
        console.warn(`[Webhook] Verification attempt ${pendingId} (chatId: ${chatId}) has expired.`);
        await updateVerificationAttempt(pendingId, { status: 'expired', updatedAt: Date.now() });
        bot.sendMessage(chatId, "Sorry, your verification request has expired. Please try starting the process again on our website.");
        return;
      }

      // Link chatId to the attempt and send the code
      await updateVerificationAttempt(pendingId, { 
        telegramChatId: chatId, 
        status: 'code_sent',
        updatedAt: Date.now()
      });
      
      console.log(`[Webhook] Successfully linked chatId ${chatId} to pendingId ${pendingId}. Sending code ${attempt.code} for phone ${attempt.fullPhoneNumber}.`);
      bot.sendMessage(chatId, `Your verification code for ${attempt.fullPhoneNumber} is: ${attempt.code}\n\nPlease enter this code on the website to complete verification.`);

    } catch (error: any) {
      console.error(`[Webhook] Error processing /start ${pendingId} for chatId ${chatId}:`, error.message || error);
      bot.sendMessage(chatId, "Sorry, an error occurred while processing your request. Please try again later or contact support if the issue persists.");
    }
  });

  // Generic /start handler if no payload or different payload
  bot.onText(/\/start$/, (msg) => {
     const chatId = msg.chat.id;
     console.log(`[Webhook] Received generic /start command from chat ID: ${chatId}`);
     bot.sendMessage(chatId, "Welcome to TeleVerify! To verify your phone number, please initiate the process from our partner website. You will then be guided back here.");
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
