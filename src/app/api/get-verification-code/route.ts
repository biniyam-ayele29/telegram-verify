
// src/app/api/get-verification-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verificationStore, FullPhoneNumberSchema, CODE_EXPIRATION_MS } from '@/lib/verification-shared'; // Import from the new shared file

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phoneNumberParam = searchParams.get('phoneNumber');
  console.log(`[/api/get-verification-code] Received request for phoneNumber: ${phoneNumberParam}`);

  if (!phoneNumberParam) {
    console.error('[/api/get-verification-code] Phone number query parameter is missing.');
    return NextResponse.json({ success: false, message: 'Phone number query parameter is required.' }, { status: 400 });
  }

  const validatedPhoneNumberResult = FullPhoneNumberSchema.safeParse(phoneNumberParam);
  if (!validatedPhoneNumberResult.success) {
    console.error(`[/api/get-verification-code] Invalid phone number format: ${phoneNumberParam}. Error: ${validatedPhoneNumberResult.error.errors[0].message}`);
    return NextResponse.json({ success: false, message: 'Invalid phone number format.' }, { status: 400 });
  }
  const validatedPhoneNumber = validatedPhoneNumberResult.data; // Use the validated data as the key

  console.log(`[/api/get-verification-code] Attempting to retrieve code for validated phone: ${validatedPhoneNumber}. Current store size: ${verificationStore.size}`);
  // Log current store contents for debugging (can be noisy)
  // console.log("[/api/get-verification-code] Current verificationStore contents:", Object.fromEntries(verificationStore.entries()));


  const attempt = verificationStore.get(validatedPhoneNumber);

  if (!attempt) {
    console.warn(`[/api/get-verification-code] No verification code found for ${validatedPhoneNumber}. It might have expired or not been requested.`);
    return NextResponse.json({ success: false, message: 'No verification code found for this phone number. It might have expired or not been requested.' }, { status: 404 });
  }
  console.log(`[/api/get-verification-code] Found attempt for ${validatedPhoneNumber}:`, JSON.stringify(attempt));


  if (Date.now() > attempt.expiresAt) {
    console.warn(`[/api/get-verification-code] Verification code for ${validatedPhoneNumber} has expired. Expired at: ${new Date(attempt.expiresAt).toISOString()}`);
    verificationStore.delete(validatedPhoneNumber); // Clean up expired code
    return NextResponse.json({ success: false, message: 'Verification code has expired.' }, { status: 410 });
  }

  // The bot is just retrieving the code, not verifying it.
  // So, we don't decrement attempts here.
  console.log(`[/api/get-verification-code] Successfully retrieved code ${attempt.code} for ${validatedPhoneNumber}.`);
  return NextResponse.json({ success: true, verificationCode: attempt.code, fullPhoneNumber: attempt.fullPhoneNumber }, { status: 200 });
}

