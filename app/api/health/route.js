import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    databaseUrlExists: !!process.env.DATABASE_URL,
    nextauthSecretExists: !!process.env.NEXTAUTH_SECRET,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelTargetEnv: process.env.VERCEL_TARGET_ENV,
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF,
    availableEnvKeys: Object.keys(process.env).filter(
      (key) =>
        !key.toLowerCase().includes("secret") &&
        !key.toLowerCase().includes("key") &&
        !key.toLowerCase().includes("url") &&
        !key.toLowerCase().includes("pass"),
    ),
  });
}
