import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
dotenv.config();

// Initialize Firebase Admin
let app: App;
const apps = getApps();

if (!apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyFromEnv = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error(
      "FIREBASE_PROJECT_ID is not set in the environment variables. Firebase Admin SDK initialization failed."
    );
  }
  if (!clientEmail) {
    throw new Error(
      "FIREBASE_CLIENT_EMAIL is not set in the environment variables. Firebase Admin SDK initialization failed."
    );
  }
  if (!privateKeyFromEnv) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not set in the environment variables. Firebase Admin SDK initialization failed."
    );
  }

  // The replace is crucial for keys copied from the JSON file that contain literal '\n'
  const privateKey = privateKeyFromEnv.replace(/\\n/g, "\n");

  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK Initialization Error:", error.message);
    // Re-throw the error with a more specific message if it's about PEM parsing
    if (
      error.message.includes("PEM") ||
      error.message.includes("private key") ||
      error.message.includes("parse key")
    ) {
      throw new Error(
        `Failed to parse Firebase private key. The FIREBASE_PRIVATE_KEY in your .env file is likely malformed. It MUST be the ENTIRE string value from your service account JSON file (starting with "-----BEGIN PRIVATE KEY-----" and ending with "-----END PRIVATE KEY-----\\n"), enclosed in ONE PAIR of double quotes ("...key..."), and form a SINGLE CONTINUOUS LINE in your .env file. All '\\n' characters from the JSON key MUST be preserved literally as '\\n' (a backslash followed by an 'n') within those quotes. Example: FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBg...rest of key...\\n-----END PRIVATE KEY-----\\n". Original error: ${error.message}`
      );
    }
    throw error; // Re-throw other initialization errors
  }
} else {
  app = apps[0];
}

const adminDb = getFirestore(app);

export { adminDb };
