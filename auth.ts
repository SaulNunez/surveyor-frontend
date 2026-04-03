import type {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from "next"
import type { NextAuthOptions } from "next-auth"
import { getServerSession } from "next-auth"
import bcrypt from "bcrypt";
import Credentials from "next-auth/providers/credentials";
import dbConnect from "./app/lib/data";
import { getUserByEmail } from "./libs/services/auth/userService";

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
                await dbConnect();
                const user = await getUserByEmail(credentials.email);
                if (!user) {
                    throw new Error('Invalid credentials');
                }

                const isMatch = bcrypt.compare(credentials.password, user.hash);
                if (!isMatch) {
                    throw new Error('Invalid credentials');
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.displayName
                };
            },
        }),
  ], // rest of your config
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