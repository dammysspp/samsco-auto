import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Developer Access",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "admin@fifa2026.com",
        },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        let user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email: credentials.email,
              name: "Admin Developer",
            },
          });
        }

        return user;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET || "fifa_world_cup_dashboard_secret_2026",
};

export async function getDynamicAuthOptions() {
  const settings = await prisma.scheduleSettings.findFirst();
  const googleClientId =
    settings?.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret =
    settings?.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

  const providers = [...authOptions.providers];

  if (googleClientId && googleClientSecret) {
    providers.push(
      GoogleProvider({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      }),
    );
  } else {
    // Inject a dummy fallback during initialization to prevent next-auth boot crashes
    providers.push(
      GoogleProvider({
        clientId: "dummy-id",
        clientSecret: "dummy-secret",
      }),
    );
  }

  return {
    ...authOptions,
    providers,
  };
}
