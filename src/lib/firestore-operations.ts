import { adminDb } from "./firebase-admin";
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
  const docRef = adminDb
    .collection(VERIFICATION_CODES_COLLECTION)
    .doc(phoneNumber);
  await retryOperation(async () => {
    await docRef.set({
      ...data,
      createdAt: new Date(),
    });
  });
}

export async function getVerificationCode(
  phoneNumber: string
): Promise<VerificationAttempt | null> {
  const docRef = adminDb
    .collection(VERIFICATION_CODES_COLLECTION)
    .doc(phoneNumber);
  return await retryOperation(async () => {
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    if (!data) {
      return null;
    }

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
  const docRef = adminDb
    .collection(VERIFICATION_CODES_COLLECTION)
    .doc(phoneNumber);
  await retryOperation(async () => {
    await docRef.set(
      {
        ...data,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  });
}

export async function deleteVerificationCode(
  phoneNumber: string
): Promise<void> {
  const docRef = adminDb
    .collection(VERIFICATION_CODES_COLLECTION)
    .doc(phoneNumber);
  await retryOperation(async () => {
    await docRef.delete();
  });
}
