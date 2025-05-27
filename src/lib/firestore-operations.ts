
// src/lib/firestore-operations.ts
import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import type { VerificationAttempt, TelegramBotSession } from "./verification-shared";

const VERIFICATION_ATTEMPTS_COLLECTION = "verificationAttempts";
const TELEGRAM_BOT_SESSIONS_COLLECTION = "telegramBotSessions";

console.log(`[Firestore Operations Module] Initialized. Using collections: 
  ${VERIFICATION_ATTEMPTS_COLLECTION}, 
  ${TELEGRAM_BOT_SESSIONS_COLLECTION}
`);
// Add a console warning for in-memory store limitations.
if (process.env.NODE_ENV === 'development') {
    console.warn("[Firestore Operations Module] CRITICAL: Ensure Firestore is properly configured and rules are set. In-memory stores are not used here, but Firestore access needs to be correct.");
}


// --- VerificationAttempt Operations ---

/**
 * Stores a new verification attempt.
 * The document ID will be attempt.id (which is the pendingVerificationId).
 */
export async function storeVerificationAttempt(
  attempt: VerificationAttempt
): Promise<void> {
  const attemptId = attempt.id; // This is the pendingVerificationId
  const loggableAttempt = { ...attempt };
  // @ts-ignore
  delete loggableAttempt.code; // Don't log the actual code

  console.log(
    `[Firestore] Attempting to store verification attempt with id: ${attemptId} for website phone: ${attempt.websitePhoneNumber}. ClientID: ${attempt.clientId}`
  );
  console.log("[Firestore] Data to be stored (code omitted for logging):", JSON.stringify(loggableAttempt));
  try {
    const attemptDocRef = doc(
      db,
      VERIFICATION_ATTEMPTS_COLLECTION,
      attemptId
    );
    // Ensure all timestamp fields are correctly converted if they are numbers
    const dataToStore: any = { ...attempt };
    if (typeof attempt.createdAt === 'number') {
        dataToStore.createdAt = Timestamp.fromMillis(attempt.createdAt);
    }
    if (typeof attempt.expiresAt === 'number') {
        dataToStore.expiresAt = Timestamp.fromMillis(attempt.expiresAt);
    }
    if (attempt.updatedAt && typeof attempt.updatedAt === 'number') {
        dataToStore.updatedAt = Timestamp.fromMillis(attempt.updatedAt);
    } else {
        dataToStore.updatedAt = Timestamp.now(); // Default if not provided or not a number
    }


    await setDoc(attemptDocRef, dataToStore);
    console.log(
      `[Firestore] Successfully stored verification attempt with id: ${attemptId}`
    );
  } catch (error) {
    console.error(
      `[Firestore] Error storing verification attempt id ${attemptId}:`,
      error
    );
    throw error; // Re-throw the error so the caller (e.g., server action) knows it failed
  }
}

/**
 * Retrieves a verification attempt by its ID (pendingVerificationId).
 */
export async function getVerificationAttemptById(
  pendingId: string
): Promise<VerificationAttempt | null> {
  console.log(
    `[Firestore] Attempting to retrieve verification attempt by id: ${pendingId}`
  );
  const attemptDocRef = doc(db, VERIFICATION_ATTEMPTS_COLLECTION, pendingId);
  try {
    const docSnap = await getDoc(attemptDocRef);

    if (!docSnap.exists()) {
      console.log(
        `[Firestore] No verification attempt found with id: ${pendingId}`
      );
      return null;
    }

    const data = docSnap.data();
    // Convert Firestore Timestamps back to numbers (milliseconds)
    const attempt: VerificationAttempt = {
      id: docSnap.id,
      clientId: data.clientId,
      websitePhoneNumber: data.websitePhoneNumber,
      code: data.code,
      expiresAt: (data.expiresAt as Timestamp).toMillis(),
      attemptsRemaining: data.attemptsRemaining,
      telegramChatId: data.telegramChatId === undefined ? null : data.telegramChatId, // Handle undefined from older docs
      telegramPhoneNumber: data.telegramPhoneNumber,
      status: data.status,
      createdAt: (data.createdAt as Timestamp).toMillis(),
      updatedAt: (data.updatedAt as Timestamp)?.toMillis(),
    };
    console.log(
      `[Firestore] Successfully retrieved verification attempt for id: ${pendingId}, status: ${attempt.status}`
    );
    return attempt;
  } catch (error) {
      console.error(`[Firestore] Error retrieving verification attempt by ID ${pendingId}:`, error);
      throw error;
  }
}

/**
 * Updates specific fields of a verification attempt.
 */
export async function updateVerificationAttempt(
  pendingId: string,
  dataToUpdate: Partial<Omit<VerificationAttempt, "id" | "code" | "createdAt">> // Allow clientId to be updated if necessary, but not typical
): Promise<void> {
  console.log(
    `[Firestore] Attempting to update verification attempt id: ${pendingId} with data:`,
    JSON.stringify(dataToUpdate)
  );
  const attemptDocRef = doc(db, VERIFICATION_ATTEMPTS_COLLECTION, pendingId);
  try {
    const updatePayload: any = { ...dataToUpdate, updatedAt: Timestamp.now() };
    
    // Convert numeric timestamps in dataToUpdate to Firestore Timestamps if they exist
    if (dataToUpdate.expiresAt && typeof dataToUpdate.expiresAt === 'number') {
      updatePayload.expiresAt = Timestamp.fromMillis(dataToUpdate.expiresAt);
    }
    // createdAt should not be updated after creation usually, but if it is, ensure it's a Timestamp
    if (dataToUpdate.createdAt && typeof dataToUpdate.createdAt === 'number') {
        console.warn(`[Firestore] Attempting to update createdAt for ${pendingId}. This is unusual.`);
        updatePayload.createdAt = Timestamp.fromMillis(dataToUpdate.createdAt);
    }
    
    await updateDoc(attemptDocRef, updatePayload);
    console.log(
      `[Firestore] Successfully updated verification attempt id: ${pendingId}`
    );
  } catch (error) {
      console.error(`[Firestore] Error updating verification attempt ID ${pendingId}:`, error);
      throw error;
  }
}

/**
 * Deletes a verification attempt by its ID.
 */
export async function deleteVerificationAttempt(
  pendingId: string
): Promise<void> {
  console.log(
    `[Firestore] Attempting to delete verification attempt id: ${pendingId}`
  );
  const attemptDocRef = doc(db, VERIFICATION_ATTEMPTS_COLLECTION, pendingId);
  try {
    await deleteDoc(attemptDocRef);
    console.log(
      `[Firestore] Successfully deleted verification attempt id: ${pendingId}`
    );
  } catch (error) {
      console.error(`[Firestore] Error deleting verification attempt ID ${pendingId}:`, error);
      throw error;
  }
}


// --- TelegramBotSession Operations ---

/**
 * Stores or updates a bot session. Document ID is chatId.
 */
export async function storeBotSession(session: TelegramBotSession): Promise<void> {
  console.log(`[Firestore] Storing bot session for chatId ${session.chatId}, pendingId ${session.pendingVerificationId}`);
  try {
    const sessionDocRef = doc(db, TELEGRAM_BOT_SESSIONS_COLLECTION, String(session.chatId));
    await setDoc(sessionDocRef, {
      ...session,
      createdAt: Timestamp.fromMillis(session.createdAt), // Convert number to Timestamp
    });
    console.log(`[Firestore] Successfully stored bot session for chatId ${session.chatId}`);
  } catch (error) {
    console.error(`[Firestore] Error storing bot session for chatId ${session.chatId}:`, error);
    throw error;
  }
}

/**
 * Retrieves a bot session by chatId.
 */
export async function getBotSessionByChatId(chatId: number): Promise<TelegramBotSession | null> {
  console.log(`[Firestore] Retrieving bot session for chatId ${chatId}`);
  const sessionDocRef = doc(db, TELEGRAM_BOT_SESSIONS_COLLECTION, String(chatId));
  try {
    const docSnap = await getDoc(sessionDocRef);

    if (!docSnap.exists()) {
      console.log(`[Firestore] No bot session found for chatId ${chatId}`);
      return null;
    }
    const data = docSnap.data();
    const session: TelegramBotSession = {
      chatId: data.chatId,
      pendingVerificationId: data.pendingVerificationId,
      createdAt: (data.createdAt as Timestamp).toMillis(), // Convert Timestamp to number
    };
    console.log(`[Firestore] Successfully retrieved bot session for chatId ${chatId}`);
    return session;
  } catch (error) {
      console.error(`[Firestore] Error retrieving bot session for chatId ${chatId}:`, error);
      throw error;
  }
}

/**
 * Deletes a bot session by chatId.
 */
export async function deleteBotSession(chatId: number): Promise<void> {
  console.log(`[Firestore] Deleting bot session for chatId ${chatId}`);
  try {
    const sessionDocRef = doc(db, TELEGRAM_BOT_SESSIONS_COLLECTION, String(chatId));
    await deleteDoc(sessionDocRef);
    console.log(`[Firestore] Successfully deleted bot session for chatId ${chatId}`);
  } catch (error) {
    console.error(`[Firestore] Error deleting bot session for chatId ${chatId}:`, error);
    // Not throwing error, as this is cleanup. Log it.
  }
}

/**
 * Finds a previous attempt for a given phone number and Telegram chat ID
 * where the contact share was successful (status 'code_sent' or 'verified').
 */
export async function findPastSuccessfulContactMatchForPhone(
  websitePhoneNumber: string,
  telegramChatId: number
): Promise<VerificationAttempt | null> {
  console.log(
    `[Firestore] Checking for previously successful contact match for phone: ${websitePhoneNumber} and chatId: ${telegramChatId}`
  );
  try {
    const attemptsCollectionRef = collection(db, VERIFICATION_ATTEMPTS_COLLECTION);
    const q = query(
      attemptsCollectionRef,
      where("websitePhoneNumber", "==", websitePhoneNumber),
      where("telegramChatId", "==", telegramChatId),
      where("status", "in", ["code_sent", "verified"]), // Key change: check for 'code_sent' or 'verified'
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      const attempt: VerificationAttempt = {
        id: docSnap.id,
        clientId: data.clientId,
        websitePhoneNumber: data.websitePhoneNumber,
        code: data.code, 
        expiresAt: (data.expiresAt as Timestamp).toMillis(),
        attemptsRemaining: data.attemptsRemaining,
        telegramChatId: data.telegramChatId,
        telegramPhoneNumber: data.telegramPhoneNumber,
        status: data.status,
        createdAt: (data.createdAt as Timestamp).toMillis(),
        updatedAt: (data.updatedAt as Timestamp)?.toMillis(),
      };
      console.log(
        `[Firestore] Found past successful contact match (ID: ${docSnap.id}, Status: ${attempt.status}) for phone: ${websitePhoneNumber} and chatId: ${telegramChatId}`
      );
      return attempt;
    }
    console.log(
      `[Firestore] No past successful contact match found for phone: ${websitePhoneNumber} and chatId: ${telegramChatId}`
    );
    return null;
  } catch (error) {
    console.error(
      `[Firestore] Error finding past successful contact match for ${websitePhoneNumber}:`,
      error
    );
    return null;
  }
}
