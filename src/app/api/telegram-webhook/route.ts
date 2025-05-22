
// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error('CRITICAL: TELEGRAM_BOT_TOKEN is not defined in .env. The bot will not work.');
}
if (!appUrl) {
  console.error('CRITICAL: NEXT_PUBLIC_APP_URL is not defined in .env. The bot may not be able to call its own API.');
}

// Initialize bot here so listeners are attached to this instance
// Ensure a token is provided, otherwise TelegramBot constructor will throw an error.
// If token is undefined, bot operations will fail silently or throw errors later.
const bot = new TelegramBot(token || 'DUMMY_TOKEN_INITIALIZATION_WILL_FAIL_LATER'); 
if (token) {
  console.log('Telegram bot initialized with a token.');
} else {
  console.error('Telegram bot initialized WITHOUT a token. Please set TELEGRAM_BOT_TOKEN.');
}


// Handler for /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`[Webhook] Received /start command from chat ID: ${chatId}`);
  const opts: TelegramBot.SendMessageOptions = {
    reply_markup: {
      keyboard: [
        [{ text: 'Share my phone number', request_contact: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
  bot.sendMessage(chatId, 'Welcome! Please share your phone number to get your verification code.', opts)
    .then(() => console.log(`[Webhook] Sent 'request_contact' prompt to chat ID: ${chatId}`))
    .catch(err => console.error(`[Webhook] Error sending 'request_contact' prompt to ${chatId}:`, err.message || err));
});

// Handler for receiving contact (phone number)
bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  console.log(`[Webhook] Received contact from chat ID: ${chatId}`, msg.contact);

  if (msg.contact && msg.contact.phone_number) {
    let phoneNumber = msg.contact.phone_number;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber}`;
    }
    console.log(`[Webhook] Processing phone number: ${phoneNumber} for chat ID: ${chatId}`);

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
        const replyMessage = response.data.message || 'Could not retrieve your code. Please try requesting one from the website again.';
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
      bot.sendMessage(chatId, 'Sorry, there was an error trying to get your verification code. Please try again on the website.')
        .catch(err => console.error(`[Webhook] Error sending general error message to ${chatId}:`, err.message || err));
    }
  } else {
    console.log(`[Webhook] Could not read phone number from contact message (chat ID: ${chatId}).`);
    bot.sendMessage(chatId, 'Could not read your phone number. Please try sharing your contact again.')
      .catch(err => console.error(`[Webhook] Error sending 'could not read phone' message to ${chatId}:`, err.message || err));
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
    bot.processUpdate(update); // This bot instance has listeners attached
    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Webhook] Error processing Telegram update in POST handler:', error.message || error);
    return NextResponse.json({ status: 'error', message: 'Failed to process update' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('[Webhook] Received GET request on /api/telegram-webhook (typically for health check or initial setup).');
  return NextResponse.json({ message: 'Telegram webhook is active. Use POST for updates.' });
}

