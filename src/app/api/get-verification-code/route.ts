
// src/app/api/get-verification-code/route.ts
// This file is NO LONGER USED by the primary verification flow.
// The Telegram bot webhook now directly handles looking up the pending verification
// and sending the code.
// This file can be DELETED or kept if you have other uses for it.
// For now, I will empty it to prevent accidental use and indicate it's deprecated for this flow.

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.warn("[/api/get-verification-code] This endpoint is deprecated for the primary OTP flow. Bot handles code retrieval directly.");
  return NextResponse.json(
    { 
      success: false, 
      message: "This endpoint is deprecated for the primary OTP flow. Please check the new webhook logic." 
    },
    { status: 410 } // 410 Gone
  );
}
