import { getUserByEmail } from "@/libs/services/auth/userService";
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials";
const bcrypt = require("bcryptjs");

export const authOptions = {
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

                const isMatch = bcrypt.compare(credentials.password, user.password);
                if (!isMatch) {
                    throw new Error('Invalid credentials');
                }

                return {
                    id: user.id,
                    email: user.email
                };
            },
        }),
    ]
};

export default NextAuth(authOptions);