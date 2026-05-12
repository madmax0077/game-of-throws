import type { NextAuthOptions } from "next-auth";
import type { Provider } from "next-auth/providers/index";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "./prisma";

// "Continue with Google" is enabled in production whenever both env vars are
// set on Vercel:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
// First-time Google users are auto-created as PLAYER accounts with a
// matching Player profile.
const providers: Provider[] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials.password) return null;
      const user = await prisma.user.findUnique({
        where: { email: credentials.email.toLowerCase() }
      });
      if (!user) return null;
      const ok = await bcrypt.compare(credentials.password, user.passwordHash);
      if (!ok) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.avatarUrl ?? undefined,
        role: user.role
      };
    }
  })
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Always show the account picker so the user can switch Google accounts
      // without being silently signed back in to a stale one.
      authorization: {
        params: { prompt: "select_account" }
      }
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, account }) {
      // First sign-in via Google: ensure a User + Player row exist, link by email.
      if (account?.provider === "google" && user?.email) {
        const email = user.email.toLowerCase();
        let dbUser = await prisma.user.findUnique({ where: { email } });
        if (!dbUser) {
          // Google-only account: store an unguessable random password hash so
          // the Credentials provider can never sign them in.
          const randomPwd = crypto.randomBytes(32).toString("hex");
          const passwordHash = await bcrypt.hash(randomPwd, 10);
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? email.split("@")[0],
              passwordHash,
              avatarUrl: user.image ?? null,
              role: "PLAYER"
            }
          });
          await prisma.player.create({
            data: {
              userId: dbUser.id,
              name: dbUser.name,
              role: "BATTER",
              battingHand: "RIGHT",
              avatarUrl: user.image ?? null
            }
          });
        } else if (!dbUser.avatarUrl && user.image) {
          // Backfill avatar from Google profile picture on subsequent sign-ins.
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { avatarUrl: user.image }
          });
        }
        token.id = dbUser.id;
        token.role = dbUser.role;
        return token;
      }

      // First sign-in via Credentials: copy id + role from the returned user.
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
        return token;
      }

      // Subsequent requests: refresh role from DB so promotions/demotions
      // take effect without forcing a re-login.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true }
        });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "ORGANIZER";
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
