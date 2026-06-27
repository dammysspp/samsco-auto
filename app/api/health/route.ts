import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    databaseUrlExists: !!process.env.DATABASE_URL,
    nextauthSecretExists: !!process.env.NEXTAUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
    availableEnvKeys: Object.keys(process.env).filter(
      (key) => !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("key") && !key.toLowerCase().includes("url") && !key.toLowerCase().includes("pass")
    ),
  });
}
