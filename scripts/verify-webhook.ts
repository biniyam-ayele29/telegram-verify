
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import axios from "axios";

// Load environment variables
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is not set in .env file");
  process.exit(1);
}

if (!appUrl) {
  console.error("❌ NEXT_PUBLIC_APP_URL is not set in .env file");
  process.exit(1);
}

async function verifyWebhook() {
  try {
    console.log("🔍 Checking webhook status...");

    // First, check current webhook info
    const webhookInfo = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    console.log("📡 Current webhook info:", webhookInfo.data);

    if (webhookInfo.data.ok) {
      const currentUrl = webhookInfo.data.result.url;
      const expectedUrl = appUrl
        ? `${appUrl.replace(/\/+$/, "")}/api/telegram-webhook`
        : "";

      console.log("🔗 Current webhook URL:", currentUrl);
      console.log("🎯 Expected webhook URL:", expectedUrl);

      if (currentUrl === expectedUrl) {
        console.log("✅ Webhook is correctly set up!");
      } else {
        console.log("⚠️ Webhook URL mismatch. Setting up correct webhook...");

        // Delete existing webhook
        await axios.get(`https://api.telegram.org/bot${token}/deleteWebhook`);
        console.log("🗑️ Deleted existing webhook");

        // Set up new webhook
        const setWebhook = await axios.get(
          `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(
            expectedUrl
          )}`
        );
        console.log("📡 Set webhook result:", setWebhook.data);

        if (setWebhook.data.ok) {
          console.log("✅ Webhook successfully set up!");
        } else {
          console.error("❌ Failed to set webhook:", setWebhook.data);
        }
      }
    } else {
      console.error("❌ Failed to get webhook info:", webhookInfo.data);
    }

    // Test bot connection
    console.log("\n🤖 Testing bot connection...");
    const botInfo = await axios.get(
      `https://api.telegram.org/bot${token}/getMe`
    );
    if (botInfo.data.ok) {
      console.log("✅ Bot is connected!");
      console.log("📱 Bot details:", botInfo.data.result);
      console.log(
        "\n💡 You can now message your bot at:",
        `https://t.me/${botInfo.data.result.username}`
      );
    } else {
      console.error("❌ Failed to connect to bot:", botInfo.data);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

verifyWebhook();
