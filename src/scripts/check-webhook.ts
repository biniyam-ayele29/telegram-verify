import { config } from "dotenv";
import axios from "axios";

config(); // Load environment variables

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is not defined in .env");
  process.exit(1);
}

if (!appUrl) {
  console.error("NEXT_PUBLIC_APP_URL is not defined in .env");
  process.exit(1);
}

async function checkWebhook() {
  try {
    console.log("Current environment:");
    console.log("TELEGRAM_BOT_TOKEN:", token ? "✓ Set" : "✗ Not set");
    console.log("NEXT_PUBLIC_APP_URL:", appUrl);
    console.log("\nChecking webhook status...\n");

    const response = await axios.get(
      `https://api.telegram.org/bot${token}/getWebhookInfo`
    );
    console.log("Webhook Info:", JSON.stringify(response.data, null, 2));

    if (response.data.ok && response.data.result.url) {
      console.log("\nCurrent webhook URL:", response.data.result.url);
      console.log("Expected webhook URL:", `${appUrl}/api/telegram-webhook`);

      if (response.data.result.url === `${appUrl}/api/telegram-webhook`) {
        console.log("\n✓ Webhook is correctly configured!");
      } else {
        console.log("\n✗ Webhook URL mismatch!");
        console.log("To fix this, run: npm run setup-webhook");
      }
    } else {
      console.log("\n✗ No webhook is set!");
      console.log("To set the webhook, run: npm run setup-webhook");
    }
  } catch (error: any) {
    console.error(
      "Error checking webhook:",
      error.response?.data || error.message
    );
  }
}

checkWebhook();
