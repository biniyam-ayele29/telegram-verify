// scripts/seed-admin.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env" }); // Ensure .env variables are loaded

import { adminDb } from "../src/lib/firebase-admin"; // Adjust path if needed
import { hashPassword } from "../src/lib/auth/utils"; // Adjust path
import { ADMIN_USERS_COLLECTION } from "../src/lib/auth/config"; // Adjust path
import { Timestamp } from "firebase-admin/firestore";

// CRITICAL SECURITY WARNING:
// The password "GA$%dmin5" is a KNOWN DEFAULT.
// If you run this script, YOU MUST CHANGE THIS PASSWORD IMMEDIATELY
// in your production environment through a secure admin interface or direct database modification.
// For production, consider prompting for a password or generating a random one
// instead of hardcoding it here.
const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "GA$%dmin5"; // <<<!!! CRITICAL: CHANGE THIS OR REMOVE HARDCODING !!!>>>

async function seedAdminUser() {
  console.log("Starting admin user seeding...");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.warn("CRITICAL SECURITY WARNING: The seed script uses a default admin password.");
  console.warn(`If this is a production environment, ensure password '${ADMIN_PASSWORD}' for user '${ADMIN_USERNAME}'`);
  console.warn("is changed IMMEDIATELY after seeding through a secure mechanism.");
  console.warn("Consider modifying this script to prompt for a password or generate a random one.");
  console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");


  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error(
      "ERROR: Firebase Admin SDK environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are not fully set."
    );
    console.error(
      "Please ensure your .env file is correctly populated with Firebase Admin credentials."
    );
    process.exit(1);
  }

  try {
    // Check if admin user already exists
    const existingUserQuery = await adminDb
      .collection(ADMIN_USERS_COLLECTION)
      .where("username", "==", ADMIN_USERNAME)
      .limit(1)
      .get();

    if (!existingUserQuery.empty) {
      console.log(
        `Admin user "${ADMIN_USERNAME}" already exists. Seeding skipped.`
      );
      return;
    }

    const hashedPassword = await hashPassword(ADMIN_PASSWORD);

    await adminDb.collection(ADMIN_USERS_COLLECTION).add({
      username: ADMIN_USERNAME,
      hashedPassword: hashedPassword,
      createdAt: Timestamp.now(),
    });

    console.log(`Admin user "${ADMIN_USERNAME}" created successfully.`);
    console.log("IMPORTANT: Password was hashed before storing.");
  } catch (error) {
    console.error("Error seeding admin user:", error);
    process.exit(1);
  }
}

seedAdminUser()
  .then(() => {
    console.log("Admin user seeding process finished.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Unhandled error in seeding process:", err);
    process.exit(1);
  });
