// src/app/api/set-telegram-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL; // Your app's public URL

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
}
if (!appUrl) {
  throw new Error('NEXT_PUBLIC_APP_URL is not defined in .env for setting webhook.');
}

const bot = new TelegramBot(token);

export async function GET(request: NextRequest) {
  const webhookUrl = `${appUrl}/api/telegram-webhook`;

  try {
    await bot.setWebHook(webhookUrl);
    return NextResponse.json({ success: true, message: `Webhook set to ${webhookUrl}` });
  } catch (error: any) {
    console.error('Error setting Telegram webhook:', error);
    return NextResponse.json({ success: false, message: `Failed to set webhook: ${error.message}` }, { status: 500 });
  }
}
