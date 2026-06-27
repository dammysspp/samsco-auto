import NextAuth from "next-auth";
import { getDynamicAuthOptions } from "@/lib/auth";

export async function GET(req: Request, res: any) {
  const options = await getDynamicAuthOptions();
  return NextAuth(options)(req, res);
}

export async function POST(req: Request, res: any) {
  const options = await getDynamicAuthOptions();
  return NextAuth(options)(req, res);
}
