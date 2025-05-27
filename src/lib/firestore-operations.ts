
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
  limit,
  orderBy,
} from "firebase/firestore";
import type { VerificationAttempt, TelegramBotSession } from "./verification-shared";

const VERIFICATION_ATTEMPTS_COLLECTION = "verificationAttempts";
const TELEGRAM_BOT_SESSIONS_COLLECTION = "telegramBotSessions";

console.log(`[Firestore Operations] Initialized. Using collections: 
  ${VERIFICATION_ATTEMPTS_COLLECTION}, 
  ${TELEGRAM_BOT_SESSIONS_COLLECTION}
`);


// --- VerificationAttempt Operations ---

/**
 * Stores a new verification attempt.
 * The document ID will be attempt.id (which is the pendingVerificationId).
 */
export async function storeVerificationAttempt(
  attempt: VerificationAttempt
): Promise<void> {
  const attemptId = attempt.id; // This is the pendingVerificationId
  console.log(
    `[Firestore] Attempting to store verification attempt with id: ${attemptId} for website phone: ${attempt.websitePhoneNumber}`
  );
  console.log("[Firestore] Data to be stored:", JSON.stringify(attempt));
  try {
    const attemptDocRef = doc(
      db,
      VERIFICATION_ATTEMPTS_COLLECTION,
      attemptId
    );
    await setDoc(attemptDocRef, {
      ...attempt,
      createdAt: Timestamp.fromMillis(attempt.createdAt),
      expiresAt: Timestamp.fromMillis(attempt.expiresAt),
      updatedAt: attempt.updatedAt
        ? Timestamp.fromMillis(attempt.updatedAt)
        : Timestamp.fromMillis(Date.now()),
    });
    console.log(
      `[Firestore] Successfully stored verification attempt with id: ${attemptId}`
    );
  } catch (error) {
    console.error(
      `[Firestore] Error storing verification attempt id ${attemptId}:`,
      error
    );
    throw error;
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
  const docSnap = await getDoc(attemptDocRef);

  if (!docSnap.exists()) {
    console.log(
      `[Firestore] No verification attempt found with id: ${pendingId}`
    );
    return null;
  }

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
    `[Firestore] Successfully retrieved verification attempt for id: ${pendingId}, status: ${attempt.status}`
  );
  return attempt;
}

/**
 * Updates specific fields of a verification attempt.
 */
export async function updateVerificationAttempt(
  pendingId: string,
  dataToUpdate: Partial<Omit<VerificationAttempt, "id" | "clientId" | "code" | "createdAt">>
): Promise<void> {
  console.log(
    `[Firestore] Attempting to update verification attempt id: ${pendingId} with data:`,
    JSON.stringify(dataToUpdate)
  );
  const attemptDocRef = doc(db, VERIFICATION_ATTEMPTS_COLLECTION, pendingId);

  const updatePayload: any = { ...dataToUpdate, updatedAt: Timestamp.now() };
  if (dataToUpdate.expiresAt && typeof dataToUpdate.expiresAt === 'number') {
    updatePayload.expiresAt = Timestamp.fromMillis(dataToUpdate.expiresAt);
  }

  await updateDoc(attemptDocRef, updatePayload);
  console.log(
    `[Firestore] Successfully updated verification attempt id: ${pendingId}`
  );
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
  await deleteDoc(attemptDocRef);
  console.log(
    `[Firestore] Successfully deleted verification attempt id: ${pendingId}`
  );
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
      createdAt: Timestamp.fromMillis(session.createdAt),
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
  const docSnap = await getDoc(sessionDocRef);

  if (!docSnap.exists()) {
    console.log(`[Firestore] No bot session found for chatId ${chatId}`);
    return null;
  }
  const data = docSnap.data();
  const session: TelegramBotSession = {
    chatId: data.chatId,
    pendingVerificationId: data.pendingVerificationId,
    createdAt: (data.createdAt as Timestamp).toMillis(),
  };
  console.log(`[Firestore] Successfully retrieved bot session for chatId ${chatId}`);
  return session;
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
