import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// To enable "Continue with Google":
//   1. Create an OAuth Client ID in Google Cloud Console
//      (https://console.cloud.google.com/apis/credentials)
//   2. Set Authorized redirect URI to:  https://<your-domain>/api/auth/callback/google
//   3. Add env vars on Vercel:
//        GOOGLE_CLIENT_ID
//        GOOGLE_CLIENT_SECRET
//   4. Uncomment the import + provider block below and redeploy.
//
// import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
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
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    // })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // Refresh role from DB on each request (cheap thanks to indexed PK):
      // this means promoting a user in the DB is reflected on next request
      // without forcing a re-login. Safe-skips if token has no id.
      if (!user && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { role: true }
        });
        if (dbUser) token.role = dbUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id;
        session.user.role = token.role ?? "ORGANIZER";
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
