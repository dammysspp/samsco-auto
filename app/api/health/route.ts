import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    databaseUrlExists: !!process.env.DATABASE_URL,
    nextauthSecretExists: !!process.env.NEXTAUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
  });
}
