
// src/app/api/get-verification-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verificationStore, FullPhoneNumberSchema, CODE_EXPIRATION_MS } from '@/lib/verification-shared'; // Import from the new shared file

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const phoneNumber = searchParams.get('phoneNumber');

  if (!phoneNumber) {
    return NextResponse.json({ success: false, message: 'Phone number query parameter is required.' }, { status: 400 });
  }

  const validatedPhoneNumber = FullPhoneNumberSchema.safeParse(phoneNumber);
  if (!validatedPhoneNumber.success) {
    return NextResponse.json({ success: false, message: 'Invalid phone number format.' }, { status: 400 });
  }

  const attempt = verificationStore.get(validatedPhoneNumber.data);

  if (!attempt) {
    return NextResponse.json({ success: false, message: 'No verification code found for this phone number. It might have expired or not been requested.' }, { status: 404 });
  }

  if (Date.now() > attempt.expiresAt) {
    verificationStore.delete(validatedPhoneNumber.data); // Clean up expired code
    return NextResponse.json({ success: false, message: 'Verification code has expired.' }, { status: 410 });
  }

  // The bot is just retrieving the code, not verifying it.
  // So, we don't decrement attempts here.
  return NextResponse.json({ success: true, verificationCode: attempt.code, fullPhoneNumber: attempt.fullPhoneNumber }, { status: 200 });
}
