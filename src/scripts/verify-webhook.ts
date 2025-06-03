
import dotenv from "dotenv";
import axios from "axios";

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

// Type guard to ensure appUrl is defined
const safeAppUrl: string = appUrl;

async function verifyAndSetWebhook() {
  try {
    console.log("🔍 Checking webhook status...");
    const webhookInfo = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    console.log("📡 Current webhook info:", webhookInfo.data);

    if (webhookInfo.data.ok) {
      const currentUrl = webhookInfo.data.result.url;
      // Construct expected webhook URL
      if (!appUrl) {
        console.error("❌ NEXT_PUBLIC_APP_URL is not set");
        process.exit(1);
      }
      const safeAppUrl = appUrl.replace(/\/+$/, ""); // Remove trailing slashes
      const expectedUrl = `${safeAppUrl}/api/telegram-webhook`;
      console.log("🔧 Constructed webhook URL:", expectedUrl);

      // Check if webhook is already set correctly
      if (currentUrl === expectedUrl) {
        console.log("✅ Webhook is already set correctly");
        return;
      }

      console.log("⚠️ Webhook URL mismatch. Setting up correct webhook...");

      // Delete existing webhook if any
      if (currentUrl) {
        console.log("🗑️ Deleted existing webhook");
        await axios.post(`https://api.telegram.org/bot${token}/deleteWebhook`);
      }

      // Set up new webhook
      try {
        const response = await axios.post(
          `https://api.telegram.org/bot${token}/setWebhook`,
          {
            url: expectedUrl,
            allowed_updates: ["message", "callback_query"],
          }
        );

        if (response.data.ok) {
          console.log("✅ Webhook set successfully");
          console.log("📝 Webhook info:", response.data.result);
        } else {
          console.error("❌ Failed to set webhook:", response.data.description);
        }
      } catch (error: any) {
        console.error("❌ Error:", error.message);
        if (error.response) {
          console.error("Response data:", error.response.data);
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

verifyAndSetWebhook();
