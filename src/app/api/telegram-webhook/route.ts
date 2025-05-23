
// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { FullPhoneNumberSchema } from '@/lib/verification-shared'; // For phone number validation

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN is not defined in .env. The bot will not work.');
}
if (!appUrl) {
  console.error('CRITICAL: NEXT_PUBLIC_APP_URL is not defined in .env. The bot may not be able to call its own API.');
}

const bot = new TelegramBot(token || 'DUMMY_TOKEN_INITIALIZATION_WILL_FAIL_LATER');
if (token) {
  console.log('Telegram bot initialized with a token.');
} else {
  console.error('Telegram bot initialized WITHOUT a token. Please set TELEGRAM_BOT_TOKEN.');
}

// Temporary store for users awaiting phone number input after /receive
// In a real app, use a persistent store (Redis, DB) if expecting concurrent users or across server restarts.
const usersAwaitingPhoneNumber = new Set<number>(); // Stores chat_id

// Handler for /receive command
bot.onText(/\/receive/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`[Webhook] Received /receive command from chat ID: ${chatId}`);
  usersAwaitingPhoneNumber.add(chatId);
  bot.sendMessage(chatId, 'Please send your full phone number (e.g., +1234567890) that you used on the website to get your code.')
    .then(() => console.log(`[Webhook] Sent 'request for phone number' prompt to chat ID: ${chatId}`))
    .catch(err => console.error(`[Webhook] Error sending 'request for phone number' prompt to ${chatId}:`, err.message || err));
});

// Handler for general messages (potentially phone numbers after /receive)
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Ignore if it's a command or if user is not in the "awaiting phone number" state
  if (!text || text.startsWith('/') || !usersAwaitingPhoneNumber.has(chatId)) {
    // If it's a command and not /receive, or user is not awaiting phone, do nothing or handle other commands.
    // For now, if it's not /receive and they weren't prompted, we ignore.
    if (text && text.startsWith('/')) {
        console.log(`[Webhook] Received unhandled command: ${text} from chat ID: ${chatId}`);
    } else if (!usersAwaitingPhoneNumber.has(chatId) && text) {
        console.log(`[Webhook] Received message from chat ID ${chatId} but not awaiting phone number. Message: ${text.substring(0,50)}`);
    }
    return;
  }

  console.log(`[Webhook] Received potential phone number: "${text}" from chat ID: ${chatId} (was awaiting)`);
  usersAwaitingPhoneNumber.delete(chatId); // Remove user from awaiting state

  const validatedPhoneNumber = FullPhoneNumberSchema.safeParse(text.trim());

  if (!validatedPhoneNumber.success) {
    bot.sendMessage(chatId, 'Invalid phone number format. Please use the full international format (e.g., +1234567890) and try the /receive command again.')
      .then(() => console.log(`[Webhook] Sent 'invalid phone format' message to chat ID: ${chatId}`))
      .catch(err => console.error(`[Webhook] Error sending 'invalid phone format' message to ${chatId}:`, err.message || err));
    return;
  }

  const phoneNumber = validatedPhoneNumber.data;

  bot.sendMessage(chatId, `Thanks! Fetching code for ${phoneNumber}...`)
    .catch(err => console.error(`[Webhook] Error sending 'Thanks' message to ${chatId}:`, err.message || err));

  try {
    if (!appUrl) {
      console.error('[Webhook] CRITICAL: NEXT_PUBLIC_APP_URL is not defined. Cannot call API to get verification code.');
      bot.sendMessage(chatId, 'Sorry, the application is not configured correctly to fetch your code.')
        .catch(err => console.error(`[Webhook] Error sending app_url error message to ${chatId}:`, err.message || err));
      return;
    }
    const apiUrl = `${appUrl}/api/get-verification-code?phoneNumber=${encodeURIComponent(phoneNumber)}`;
    console.log(`[Webhook] Calling API: ${apiUrl} for chat ID: ${chatId}`);
    
    const response = await axios.get(apiUrl);
    console.log(`[Webhook] API response for ${phoneNumber} (chat ID: ${chatId}):`, JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.success && response.data.verificationCode) {
      bot.sendMessage(chatId, `Your verification code is: ${response.data.verificationCode}`)
        .then(() => console.log(`[Webhook] Sent verification code to chat ID: ${chatId}`))
        .catch(err => console.error(`[Webhook] Error sending verification code to ${chatId}:`, err.message || err));
    } else {
      const replyMessage = response.data.message || 'Could not retrieve your code. Please try requesting one from the website again (start with /receive in the bot).';
      bot.sendMessage(chatId, replyMessage)
        .then(() => console.log(`[Webhook] Sent '${replyMessage.substring(0,30)}...' message to chat ID: ${chatId}`))
        .catch(err => console.error(`[Webhook] Error sending 'could not retrieve' message to ${chatId}:`, err.message || err));
    }
  } catch (error: any) {
    console.error(`[Webhook] Error fetching/processing verification code for bot (chat ID: ${chatId}, phone: ${phoneNumber}):`, error.message || error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('[Webhook] Axios error response data:', JSON.stringify(error.response.data, null, 2));
      console.error('[Webhook] Axios error response status:', error.response.status);
    }
    bot.sendMessage(chatId, 'Sorry, there was an error trying to get your verification code. Please try again on the website and use /receive in the bot.')
      .catch(err => console.error(`[Webhook] Error sending general error message to ${chatId}:`, err.message || err));
  }
});

bot.on('polling_error', (error) => {
  console.error('[Webhook] Telegram Bot Polling Error (should not occur with webhooks):', error.code, error.message);
});

bot.on('webhook_error', (error) => {
  console.error('[Webhook] Telegram Bot Webhook Error:', error.code, error.message); 
});

export async function POST(request: NextRequest) {
  console.log('[Webhook] Received POST request on /api/telegram-webhook');
  if (!token) {
      console.error("[Webhook] CRITICAL: TELEGRAM_BOT_TOKEN is not set. Cannot process webhook update.");
      return NextResponse.json({ status: 'error', message: 'Bot token not configured on server' }, { status: 500 });
  }
  try {
    const update = await request.json();
    console.log('[Webhook] Update received:', JSON.stringify(update, null, 2));
    bot.processUpdate(update);
    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Webhook] Error processing Telegram update in POST handler:', error.message || error);
    return NextResponse.json({ status: 'error', message: 'Failed to process update' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('[Webhook] Received GET request on /api/telegram-webhook (typically for health check or initial setup).');
  // You could add a check here to see if the bot token is set and respond accordingly.
  if (!token) {
    return NextResponse.json({ message: 'Telegram webhook is active, but bot token is NOT configured on the server.' }, {status: 500});
  }
  return NextResponse.json({ message: 'Telegram webhook is active and bot token seems to be configured. Use POST for updates from Telegram.' });
}
