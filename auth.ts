import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next"
import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import bcrypt from "bcrypt";
import Credentials from "next-auth/providers/credentials";
import { getUserById, getUserCredentialsByEmail } from "./libs/services/auth/userService";

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
                if(!credentials?.email || !credentials?.password) {
                    throw new Error('Invalid credentials');
                }
                const user = await getUserCredentialsByEmail(credentials.email);
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
                    name: user.displayName,
                };
            },
        }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }

      // `useSession().update()` asks us to re-read the profile; the client is
      // never trusted to supply the new value itself.
      if (trigger === "update" && token.id) {
        const refreshed = await getUserById(token.id as string);
        if (refreshed) {
          token.name = refreshed.displayName;
          token.email = refreshed.email;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string | null) ?? null;
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
