import dbConnect from "@/app/lib/data";
import { getUserByEmail } from "@/libs/services/auth/userService";
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";

const handler = NextAuth({
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
                    email: user.email
                };
            },
        }),
    ]
});

export { handler as GET, handler as POST };