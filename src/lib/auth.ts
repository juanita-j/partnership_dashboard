import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const ALLOWED_EMAILS = (process.env.ALLOWED_EDITOR_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  adapter: undefined,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = credentials.email.trim().toLowerCase();
        // 프로덕션에서는 허용 이메일 목록이 반드시 있어야 함(미설정 시 누구나 로그인 가능 방지)
        const isProduction = process.env.NODE_ENV === "production";
        if (isProduction && !ALLOWED_EMAILS.length) {
          return null;
        }
        if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(email)) {
          return null;
        }
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: { email, name: email, role: "editor" },
          });
        }
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
