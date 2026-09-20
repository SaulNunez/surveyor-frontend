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
import { createAnonymousUserForSurvey } from "./libs/services/auth/anonymousAccountService";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /**
       * A guest account: no email, no password, identified only by its uuid
       * and reachable only through this browser's session cookie.
       */
      isAnonymous: boolean;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    }
  }

  interface User {
    isAnonymous?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAnonymous?: boolean;
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
                // A guest account has no password hash at all, and
                // `bcrypt.compare` throws rather than returning false when
                // handed one. There is no password that signs it in.
                if (!user || !user.password) {
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
                    isAnonymous: false,
                };
            },
        }),
    Credentials({
        id: "anonymous",
        name: "Guest",
        credentials: {
            surveyId: {
                type: "text",
                label: "Survey",
            },
        },
        // Deliberately thin. This runs inside NextAuth's own route handler, so
        // the test suite cannot reach it; every decision it rests on lives in
        // `createAnonymousUserForSurvey`, which tests call directly.
        authorize: async (credentials) => {
            if (!credentials?.surveyId) {
                throw new Error('Invalid credentials');
            }

            const user = await createAnonymousUserForSurvey(credentials.surveyId);

            return {
                id: user.id,
                email: null,
                name: null,
                isAnonymous: true,
            };
        },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.isAnonymous = user.isAnonymous ?? false;
      }

      // `useSession().update()` asks us to re-read the profile; the client is
      // never trusted to supply the new value itself.
      if (trigger === "update" && token.id) {
        const refreshed = await getUserById(token.id);
        if (refreshed) {
          token.name = refreshed.displayName;
          token.email = refreshed.email;
          // Claiming a guest account on the register screen flips this. It
          // only ever goes anonymous -> credentialed, so a token that has not
          // been refreshed yet over-restricts rather than under-restricts.
          token.isAnonymous = refreshed.isAnonymous;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id!;
        session.user.name = token.name ?? null;
        // next-auth builds `session.user` from the *decoded* token rather than
        // from what the `jwt` callback returned, so a value refreshed above
        // only reaches the client by being copied across here. Without the
        // email line, claiming a guest account leaves the session showing no
        // email forever.
        session.user.email = token.email ?? null;
        session.user.isAnonymous = token.isAnonymous ?? false;
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
