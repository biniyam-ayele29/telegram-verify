// src/app/api/get-verification-code/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getVerificationCode,
  updateVerificationCode,
} from "@/lib/firestore-operations";
import { FullPhoneNumberSchema } from "@/lib/verification-shared";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phoneNumberParam = searchParams.get("phoneNumber");
  const chatIdParam = searchParams.get("chatId");

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

  try {
    const storedData = await getVerificationCode(validatedPhoneNumber);

    if (!storedData) {
      console.warn(
        `[/api/get-verification-code] No verification code found for ${validatedPhoneNumber}`
      );
      return NextResponse.json(
        {
          success: false,
          message: "No verification code found for this phone number.",
        },
        { status: 404 }
      );
    }

    if (Date.now() > storedData.expiresAt) {
      console.warn(
        `[/api/get-verification-code] Code expired for ${validatedPhoneNumber}`
      );
      return NextResponse.json(
        {
          success: false,
          message: "Verification code has expired.",
        },
        { status: 410 }
      );
    }

    if (storedData.attemptsRemaining <= 0) {
      console.warn(
        `[/api/get-verification-code] No attempts remaining for ${validatedPhoneNumber}`
      );
      return NextResponse.json(
        {
          success: false,
          message: "No verification attempts remaining.",
        },
        { status: 403 }
      );
    }

    // Handle chatId association
    if (currentChatId) {
      if (storedData.telegramChatId === -1) {
        // First time this code is being claimed by a Telegram chat
        await updateVerificationCode(validatedPhoneNumber, {
          telegramChatId: currentChatId,
        });
        console.log(
          `[/api/get-verification-code] Code for ${validatedPhoneNumber} claimed by chatId ${currentChatId}`
        );
      } else if (storedData.telegramChatId !== currentChatId) {
        // Code was already claimed by a different chat
        console.warn(
          `[/api/get-verification-code] Unauthorized attempt for ${validatedPhoneNumber}. Code claimed by chatId ${storedData.telegramChatId}, current request from ${currentChatId}`
        );
        return NextResponse.json(
          {
            success: false,
            message:
              "This verification code is associated with a different Telegram user. Please start the process again.",
          },
          { status: 403 }
        );
      }
    }

    console.log(
      `[/api/get-verification-code] Successfully retrieved code for ${validatedPhoneNumber} (associated with chatId ${storedData.telegramChatId})`
    );

    return NextResponse.json({
      success: true,
      verificationCode: storedData.code,
    });
  } catch (error: any) {
    console.error(
      `[/api/get-verification-code] Error retrieving code for ${validatedPhoneNumber}:`,
      error.message || error
    );
    return NextResponse.json(
      {
        success: false,
        message: "Error retrieving verification code.",
      },
      { status: 500 }
    );
  }
}
