import { NextResponse } from "next/server";
import { getAuthUrl, isGoogleConfigured } from "@/lib/google";

export async function GET() {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI no están configuradas" },
      { status: 500 }
    );
  }
  return NextResponse.redirect(getAuthUrl());
}
