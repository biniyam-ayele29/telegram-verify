import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { VerificationAttempt } from "./verification-shared";

const VERIFICATION_CODES_COLLECTION = "verificationCodes";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (
      retries > 0 &&
      (error.code === "unavailable" ||
        error.code === "deadline-exceeded" ||
        error.message?.includes("socket hang up"))
    ) {
      console.log(
        `Operation failed, retrying... (${retries} attempts remaining)`
      );
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      return retryOperation(operation, retries - 1);
    }
    throw error;
  }
}

export async function storeVerificationCode(
  phoneNumber: string,
  data: Omit<VerificationAttempt, "expiresAt"> & { expiresAt: number }
): Promise<void> {
  const docRef = doc(db, VERIFICATION_CODES_COLLECTION, phoneNumber);
  await retryOperation(async () => {
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
  });
}

export async function getVerificationCode(
  phoneNumber: string
): Promise<VerificationAttempt | null> {
  const docRef = doc(db, VERIFICATION_CODES_COLLECTION, phoneNumber);
  return await retryOperation(async () => {
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      fullPhoneNumber: data.fullPhoneNumber,
      code: data.code,
      expiresAt: data.expiresAt,
      attemptsRemaining: data.attemptsRemaining,
      telegramChatId: data.telegramChatId,
    };
  });
}

export async function updateVerificationCode(
  phoneNumber: string,
  data: Partial<VerificationAttempt>
): Promise<void> {
  const docRef = doc(db, VERIFICATION_CODES_COLLECTION, phoneNumber);
  await retryOperation(async () => {
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}

export async function deleteVerificationCode(
  phoneNumber: string
): Promise<void> {
  const docRef = doc(db, VERIFICATION_CODES_COLLECTION, phoneNumber);
  await retryOperation(async () => {
    await deleteDoc(docRef);
  });
}
