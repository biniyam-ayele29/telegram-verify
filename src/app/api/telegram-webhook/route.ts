// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import {
  FullPhoneNumberSchema,
  verificationStore,
} from "@/lib/verification-shared"; // Import verificationStore from the correct path

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error(
    "CRITICAL: TELEGRAM_BOT_TOKEN is not defined in .env. The bot will not work."
  );
}
if (!appUrl) {
  console.error(
    "CRITICAL: NEXT_PUBLIC_APP_URL is not defined in .env. The bot may not be able to call its own API."
  );
}

const bot = new TelegramBot(
  token || "DUMMY_TOKEN_INITIALIZATION_WILL_FAIL_LATER"
);
if (token) {
  console.log("Telegram bot initialized with a token.");
} else {
  console.error(
    "Telegram bot initialized WITHOUT a token. Please set TELEGRAM_BOT_TOKEN."
  );
}

// Add a map to track which chat is awaiting a phone number
const awaitingPhoneNumber: Record<number, boolean> = {};

// Handler for /receive command - now prompts for phone number
bot.onText(/\/receive/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`[Webhook] /receive command received from chat ID: ${chatId}`);
  awaitingPhoneNumber[chatId] = true;
  bot.sendMessage(
    chatId,
    "Please enter your phone number (e.g., +1234567890):"
  );
});

// Handler for all messages to check if awaiting phone number
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  // Ignore messages that are commands
  if (msg.text && msg.text.startsWith("/")) return;
  if (!awaitingPhoneNumber[chatId]) return;

  const phoneNumber = msg.text?.trim();
  console.log(
    `[Webhook] Received phone number input from chat ID: ${chatId}: ${phoneNumber}`
  );

  // Validate phone number
  const validatedPhoneNumber = FullPhoneNumberSchema.safeParse(phoneNumber);
  if (!validatedPhoneNumber.success) {
    bot.sendMessage(
      chatId,
      "Invalid phone number format. Please ensure you send your full international phone number (e.g., +1234567890). Try again:"
    );
    return;
  }

  // Remove from awaiting state
  delete awaitingPhoneNumber[chatId];

  // Inform user
  bot.sendMessage(chatId, `Fetching code for ${validatedPhoneNumber.data}...`);

  if (!appUrl) {
    bot.sendMessage(
      chatId,
      "Sorry, the application is not configured correctly to fetch your code."
    );
    return;
  }

  const apiUrl = `${appUrl}/api/get-verification-code?phoneNumber=${encodeURIComponent(
    validatedPhoneNumber.data
  )}&chatId=${chatId}`;
  try {
    const response = await axios.get(apiUrl);
    if (
      response.data &&
      response.data.success &&
      response.data.verificationCode
    ) {
      // Update the chat ID in the verification store
      const attempt = verificationStore.get(validatedPhoneNumber.data);
      if (attempt && attempt.telegramChatId === -1) {
        attempt.telegramChatId = chatId;
        verificationStore.set(validatedPhoneNumber.data, attempt);
        console.log(
          `[Webhook] Updated chat ID for ${validatedPhoneNumber.data} to ${chatId}`
        );
      }

      bot.sendMessage(
        chatId,
        `Your verification code is: ${response.data.verificationCode}`
      );
    } else {
      const replyMessage =
        response.data.message ||
        "No verification code found. Please go to our website first, enter your phone number, and request a verification code. Then come back here to get it.";
      bot.sendMessage(chatId, replyMessage);
    }
  } catch (error: any) {
    bot.sendMessage(
      chatId,
      "Sorry, there was an error trying to get your verification code. Please make sure you've requested a code from our website first, then try again here."
    );
  }
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

export async function POST(request: NextRequest) {
  console.log("[Webhook] Received POST request on /api/telegram-webhook");
  console.log(
    "[Webhook] Request headers:",
    Object.fromEntries(request.headers.entries())
  );

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

    // Log specific parts of the update that we care about
    if (update.message) {
      console.log("[Webhook] Message details:", {
        chatId: update.message.chat?.id,
        text: update.message.text,
        from: update.message.from?.username,
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
