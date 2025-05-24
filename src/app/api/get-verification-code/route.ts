// src/app/api/get-verification-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  verificationStore,
  FullPhoneNumberSchema,
  CODE_EXPIRATION_MS,
} from "@/lib/verification-shared";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phoneNumberParam = searchParams.get("phoneNumber");
  const chatIdParam = searchParams.get("chatId"); // New: get chatId from query

  console.log(
    `[/api/get-verification-code] Received request for phoneNumber: ${phoneNumberParam}, chatId: ${chatIdParam}`
  );

  if (!phoneNumberParam) {
    console.error(
      "[/api/get-verification-code] Phone number query parameter is missing."
    );
    return NextResponse.json(
      { success: false, message: "Phone number query parameter is required." },
      { status: 400 }
    );
  }
  // chatIdParam is now also important for the logic, but might be missing if called by other means
  // The core logic will handle if it's essential for a particular step.

  const validatedPhoneNumberResult =
    FullPhoneNumberSchema.safeParse(phoneNumberParam);
  if (!validatedPhoneNumberResult.success) {
    console.error(
      `[/api/get-verification-code] Invalid phone number format: ${phoneNumberParam}. Error: ${validatedPhoneNumberResult.error.errors[0].message}`
    );
    return NextResponse.json(
      { success: false, message: "Invalid phone number format." },
      { status: 400 }
    );
  }
  const validatedPhoneNumber = validatedPhoneNumberResult.data;

  const currentChatId = chatIdParam ? parseInt(chatIdParam, 10) : null;
  if (chatIdParam && isNaN(currentChatId as any)) {
     console.error(
      `[/api/get-verification-code] Invalid chatId format: ${chatIdParam}. Must be a number.`
    );
    return NextResponse.json(
      { success: false, message: "Invalid chatId format." },
      { status: 400 }
    );
  }


  console.log(
    `[/api/get-verification-code] Attempting to retrieve code for validated phone: ${validatedPhoneNumber}. Current store size: ${verificationStore.size}`
  );
  const attempt = verificationStore.get(validatedPhoneNumber);

  if (!attempt) {
    console.warn(
      `[/api/get-verification-code] No verification code found for ${validatedPhoneNumber}. It might have expired or not been requested.`
    );
    return NextResponse.json(
      {
        success: false,
        message:
          "No verification code found for this phone number. It might have expired or not been requested.",
      },
      { status: 404 }
    );
  }
  console.log(
    `[/api/get-verification-code] Found attempt for ${validatedPhoneNumber}:`,
    JSON.stringify(attempt)
  );

  if (Date.now() > attempt.expiresAt) {
    console.warn(
      `[/api/get-verification-code] Verification code for ${validatedPhoneNumber} has expired. Expired at: ${new Date(
        attempt.expiresAt
      ).toISOString()}`
    );
    verificationStore.delete(validatedPhoneNumber);
    return NextResponse.json(
      { success: false, message: "Verification code has expired." },
      { status: 410 }
    );
  }

  // New logic for chatId
  if (currentChatId) {
    if (attempt.telegramChatId === -1) {
      // First time this code is being claimed by a Telegram chat
      attempt.telegramChatId = currentChatId;
      verificationStore.set(validatedPhoneNumber, { ...attempt }); // Update the store
      console.log(
        `[/api/get-verification-code] Code for ${validatedPhoneNumber} claimed by chatId ${currentChatId}. Updated store.`
      );
      // Proceed to return the code
    } else if (attempt.telegramChatId !== currentChatId) {
      // Code was already claimed by a different chat
      console.warn(
        `[/api/get-verification-code] Unauthorized attempt for ${validatedPhoneNumber}. Code claimed by chatId ${attempt.telegramChatId}, current request from ${currentChatId}.`
      );
      return NextResponse.json(
        {
          success: false,
          message:
            "This verification code is associated with a different Telegram user. Please start the process again.",
        },
        { status: 403 } // Forbidden
      );
    }
    // If attempt.telegramChatId === currentChatId, it's the same user, proceed.
  } else {
    // If no chatId was passed to the API, but the code in store has one, it's potentially problematic.
    // For now, we'll assume if a chatId is not passed, we don't do this check strictly.
    // This might need refinement depending on how this API is used elsewhere.
    // If a code is already claimed, and no chatId is passed, it's ambiguous.
    // However, our bot will always pass a chatId.
    console.warn(`[/api/get-verification-code] No chatId provided in API request for ${validatedPhoneNumber}. Proceeding without chatId validation for this request, but code might be claimed by ${attempt.telegramChatId}.`);
  }


  console.log(
    `[/api/get-verification-code] Successfully retrieved code ${attempt.code} for ${validatedPhoneNumber} (associated/claimed by chatId ${attempt.telegramChatId}).`
  );
  return NextResponse.json(
    {
      success: true,
      verificationCode: attempt.code,
      fullPhoneNumber: attempt.fullPhoneNumber,
    },
    { status: 200 }
  );
}
