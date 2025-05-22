// src/app/api/telegram-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
}
if (!appUrl) {
  throw new Error('NEXT_PUBLIC_APP_URL is not defined in .env. This is needed for the bot to call its own API.');
}

// We don't use polling, so we initialize the bot and process updates manually.
// Listeners must be set up before processUpdate is called.
const bot = new TelegramBot(token);

// Handler for /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const opts: TelegramBot.SendMessageOptions = {
    reply_markup: {
      keyboard: [
        [{ text: 'Share my phone number', request_contact: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  };
  bot.sendMessage(chatId, 'Welcome! Please share your phone number to get your verification code.', opts);
});

// Handler for receiving contact (phone number)
bot.on('contact', async (msg) => {
  const chatId = msg.chat.id;
  if (msg.contact && msg.contact.phone_number) {
    let phoneNumber = msg.contact.phone_number;
    // Ensure phone number is in E.164 format (e.g., starts with +)
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber}`;
    }

    bot.sendMessage(chatId, `Thanks! Fetching code for ${phoneNumber}...`);

    try {
      const apiUrl = `${appUrl}/api/get-verification-code?phoneNumber=${encodeURIComponent(phoneNumber)}`;
      const response = await axios.get(apiUrl);
      
      if (response.data && response.data.success && response.data.verificationCode) {
        bot.sendMessage(chatId, `Your verification code is: ${response.data.verificationCode}`);
      } else {
        bot.sendMessage(chatId, response.data.message || 'Could not retrieve your code. Please try requesting one from the website again.');
      }
    } catch (error) {
      console.error('Error fetching verification code for bot:', error);
      bot.sendMessage(chatId, 'Sorry, there was an error trying to get your verification code. Please try again on the website.');
    }
  } else {
    bot.sendMessage(chatId, 'Could not read your phone number. Please try sharing your contact again.');
  }
});


export async function POST(request: NextRequest) {
  try {
    const update = await request.json();
    // Manually process the update with the bot instance that has listeners attached.
    // This is important because if you create a new bot instance here without listeners, nothing will happen.
    bot.processUpdate(update);
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing Telegram update:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to process update' }, { status: 500 });
  }
}

// Fallback for GET or other methods - useful for simple health check or if Telegram pings with GET
export async function GET() {
  return NextResponse.json({ message: 'Telegram webhook is active. Use POST for updates.' });
}
