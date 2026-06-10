import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next"
import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import bcrypt from "bcrypt";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail } from "./libs/services/auth/userService";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    }
  }
}

// You'll need to import and pass this
// to `NextAuth` in `app/api/auth/[...nextauth]/route.ts`
export const config = {
  providers: [
    Credentials({
            credentials: {
                email: {
                    type: "email",
                    label: "Email",
                    placeholder: "johndoe@gmail.com",
                },
                password: {
                    type: "password",
                    label: "Password",
                    placeholder: "*****",
                },
            },
            authorize: async (credentials) => {
                if(!credentials) {
                    throw new Error('Invalid credentials');
                }
                const user = await getUserByEmail(credentials.email);
                if (!user) {
                    throw new Error('Invalid credentials');
                }

                const isMatch = await bcrypt.compare(credentials.password, user.password);
                if (!isMatch) {
                    throw new Error('Invalid credentials');
                }

                return {
                    id: user.id,
                    email: user.email,
                };
            },
        }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    }
  }
} satisfies NextAuthOptions

// Use it in server contexts
export function auth(
  ...args:
    | [GetServerSidePropsContext["req"], GetServerSidePropsContext["res"]]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  return getServerSession(...args, config)
}