// scripts/seed-admin.ts
import dotenv from "dotenv";
dotenv.config({ path: ".env" }); // Ensure .env variables are loaded

import { adminDb } from "../src/lib/firebase-admin"; // Adjust path if needed
import { hashPassword } from "../src/lib/auth/utils"; // Adjust path
import { ADMIN_USERS_COLLECTION } from "../src/lib/auth/config"; // Adjust path
import { Timestamp } from "firebase-admin/firestore";

const ADMIN_USERNAME = "Admin";
const ADMIN_PASSWORD = "GA$%dmin5";

async function seedAdminUser() {
  console.log("Starting admin user seeding...");

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
