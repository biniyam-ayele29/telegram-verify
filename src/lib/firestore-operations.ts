
// src/lib/firestore-operations.ts
import { db } from "./firebase"; // Using client SDK for server-side (actions, API routes)
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import type { VerificationAttempt } from "./verification-shared";

const VERIFICATION_ATTEMPTS_COLLECTION = "verificationAttempts";

/**
 * Stores a new verification attempt.
 * The document ID will be attempt.id (which is the pendingVerificationId).
 */
export async function storeVerificationAttempt(
  attempt: VerificationAttempt
): Promise<void> {
  console.log(
    `[Firestore] Attempting to store verification attempt with id: ${attempt.id} for phone: ${attempt.fullPhoneNumber}`
  );
  console.log("[Firestore] Data to be stored:", JSON.stringify(attempt));
  try {
    const attemptDocRef = doc(
      db,
      VERIFICATION_ATTEMPTS_COLLECTION,
      attempt.id
    );
    await setDoc(attemptDocRef, {
      ...attempt,
      // Convert number timestamps to Firestore Timestamps for proper querying if needed
      createdAt: Timestamp.fromMillis(attempt.createdAt),
      expiresAt: Timestamp.fromMillis(attempt.expiresAt),
      updatedAt: attempt.updatedAt ? Timestamp.fromMillis(attempt.updatedAt) : Timestamp.fromMillis(Date.now()),
    });
    console.log(
      `[Firestore] Successfully stored verification attempt with id: ${attempt.id}`
    );
  } catch (error) {
    console.error(
      `[Firestore] Error storing verification attempt id ${attempt.id}:`,
      error
    );
    throw error; // Re-throw to be caught by the calling action
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
  // Convert Firestore Timestamps back to number milliseconds
  const attempt: VerificationAttempt = {
    id: docSnap.id,
    clientId: data.clientId,
    fullPhoneNumber: data.fullPhoneNumber,
    code: data.code,
    expiresAt: (data.expiresAt as Timestamp).toMillis(),
    attemptsRemaining: data.attemptsRemaining,
    telegramChatId: data.telegramChatId,
    status: data.status,
    createdAt: (data.createdAt as Timestamp).toMillis(),
    updatedAt: (data.updatedAt as Timestamp)?.toMillis(),
  };
  console.log(
    `[Firestore] Successfully retrieved verification attempt for id: ${pendingId}`
  );
  return attempt;
}

/**
 * Updates specific fields of a verification attempt.
 * Mainly used to update status, telegramChatId, attemptsRemaining.
 */
export async function updateVerificationAttempt(
  pendingId: string,
  dataToUpdate: Partial<Omit<VerificationAttempt, 'id' | 'clientId' | 'fullPhoneNumber' | 'code' | 'createdAt'>>
): Promise<void> {
  console.log(
    `[Firestore] Attempting to update verification attempt id: ${pendingId} with data:`, JSON.stringify(dataToUpdate)
  );
  const attemptDocRef = doc(db, VERIFICATION_ATTEMPTS_COLLECTION, pendingId);
  
  const updatePayload: any = { ...dataToUpdate, updatedAt: Timestamp.now() };
  if (dataToUpdate.expiresAt) {
    updatePayload.expiresAt = Timestamp.fromMillis(dataToUpdate.expiresAt);
  }


  await updateDoc(attemptDocRef, updatePayload);
  console.log(
    `[Firestore] Successfully updated verification attempt id: ${pendingId}`
  );
}

/**
 * Deletes a verification attempt by its ID.
 * Used after successful verification or if it definitively fails/expires.
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
