// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import { FullPhoneNumberSchema } from "@/lib/verification-shared";

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error(
    "[Webhook Module] CRITICAL: TELEGRAM_BOT_TOKEN is not defined in .env. The bot will not work."
  );
} else {
  console.log("[Webhook Module] TELEGRAM_BOT_TOKEN is set.");
}
if (!appUrl) {
  console.error(
    "[Webhook Module] CRITICAL: NEXT_PUBLIC_APP_URL is not defined in .env. The bot may not be able to call its own API."
  );
} else {
  console.log(`[Webhook Module] NEXT_PUBLIC_APP_URL is set to: ${appUrl}`);
}

// Initialize bot only if token is available
const bot = token ? new TelegramBot(token) : ({} as TelegramBot); // Type assertion for conditional init
if (token) {
  console.log(
    "[Webhook Module] Telegram bot instance potentially initialized."
  );
}

// In-memory store to track users who have typed /receive and are awaiting phone number input
// IMPORTANT: This is in-memory and will not work reliably in serverless environments with multiple instances.
// A persistent store (e.g., Redis, database) should be used for production.
const usersAwaitingPhoneNumber = new Set<number>();

// Handler for /receive command
if (token) {
  bot.onText(/\/receive/, async (msg) => {
    const chatId = msg.chat.id;
    console.log(`[Webhook] /receive command received from chat ID: ${chatId}`);
    usersAwaitingPhoneNumber.add(chatId);
    console.log(
      `[Webhook] Added chat ID ${chatId} to usersAwaitingPhoneNumber. Current set: ${Array.from(
        usersAwaitingPhoneNumber
      )}`
    );
    bot.sendMessage(
      chatId,
      "Please send your full phone number (e.g., +1234567890) that you entered on the website."
    );
  });

  // Handler for all messages to check if it's a phone number from an awaiting user
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text || "";

    // Ignore messages that are commands if we are not specifically waiting for a phone number from this user
    // Or if the message is indeed a command
    if (messageText.startsWith("/") || !usersAwaitingPhoneNumber.has(chatId)) {
      if (messageText.startsWith("/") && messageText !== "/receive") {
        // Don't log for /receive itself here
        console.log(
          `[Webhook] Ignoring command '${messageText}' from chat ID ${chatId} as not awaiting phone or it's not /receive.`
        );
      } else if (!messageText.startsWith("/")) {
        // Don't log if it's not a command and user is not awaiting
        // console.log(`[Webhook] Ignoring message from chat ID ${chatId} as not awaiting phone number or message is not a phone number. Awaiting: ${usersAwaitingPhoneNumber.has(chatId)}`);
      }
      return;
    }

    // At this point, user sent /receive previously and this is their next message
    console.log(
      `[Webhook] Received potential phone number '${messageText}' from chat ID: ${chatId} who was awaiting.`
    );

    // Validate phone number
    const validatedPhoneNumberResult =
      FullPhoneNumberSchema.safeParse(messageText);
    if (!validatedPhoneNumberResult.success) {
      bot.sendMessage(
        chatId,
        "Invalid phone number format. Please ensure you send your full international phone number (e.g., +1234567890) that you used on the website. You might need to type /receive again if you made a mistake."
      );
      // Keep user in awaiting state if format is wrong, or remove them if they should retry /receive.
      // For simplicity, let's remove and ask to restart with /receive.
      usersAwaitingPhoneNumber.delete(chatId);
      console.log(
        `[Webhook] Invalid phone format from ${chatId}. Removed from awaiting. Current set: ${Array.from(
          usersAwaitingPhoneNumber
        )}`
      );
      return;
    }
    const validatedPhoneNumber = validatedPhoneNumberResult.data;

    // Remove from awaiting state as we've received what we think is the phone number
    usersAwaitingPhoneNumber.delete(chatId);
    console.log(
      `[Webhook] Processed phone for ${chatId}. Removed from awaiting. Current set: ${Array.from(
        usersAwaitingPhoneNumber
      )}`
    );

    bot.sendMessage(chatId, `Fetching code for ${validatedPhoneNumber}...`);

    if (!appUrl) {
      console.error("[Webhook] appUrl is not defined, cannot call API.");
      bot.sendMessage(
        chatId,
        "Sorry, the application is not configured correctly to fetch your code (appUrl missing)."
      );
      return;
    }

    // Call get-verification-code API
    const apiUrl = `${
      process.env.NEXT_PUBLIC_APP_URL
    }/api/get-verification-code?phoneNumber=${encodeURIComponent(
      validatedPhoneNumber
    )}&chatId=${chatId}`;

    console.log(
      `[Webhook] Calling get-verification-code API for ${validatedPhoneNumber} (chatId ${chatId})`
    );

    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;

    while (retryCount < maxRetries) {
      try {
        const response = await axios.get(apiUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        console.log(
          `[Webhook] API response for ${validatedPhoneNumber} (chatId ${chatId}):`,
          response.data
        );

        if (response.data.success) {
          await bot.sendMessage(
            chatId,
            `✅ Your verification code is: ${response.data.verificationCode}\n\nPlease use this code to verify your phone number.`
          );
        } else {
          await bot.sendMessage(
            chatId,
            `❌ ${
              response.data.error ||
              "Failed to send verification code. Please try again."
            }`
          );
        }
        break; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        retryCount++;

        if (retryCount < maxRetries) {
          console.log(
            `[Webhook] Retry ${retryCount}/${maxRetries} for ${validatedPhoneNumber} (chatId ${chatId})`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * retryCount)
          ); // Exponential backoff
          continue;
        }

        console.error(
          `[Webhook] Error calling get-verification-code API for ${validatedPhoneNumber} (chatId ${chatId}):`,
          error
        );

        await bot.sendMessage(
          chatId,
          "❌ Sorry, there was an error processing your request. Please try again in a few moments."
        );
      }
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
} else {
  console.warn(
    "[Webhook Module] Telegram bot not initialized because token is missing."
  );
}

export async function POST(request: NextRequest) {
  console.log("[Webhook] Received POST request on /api/telegram-webhook");
  // Log request headers for debugging
  // const headersObj: Record<string, string> = {};
  // request.headers.forEach((value, key) => {
  //   headersObj[key] = value;
  // });
  // console.log("[Webhook] Request headers:", JSON.stringify(headersObj, null, 2));

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
        from: update.message.from?.username || update.message.from?.id,
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
    // If a SyntaxError occurs, it might mean the body wasn't JSON or was empty
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
