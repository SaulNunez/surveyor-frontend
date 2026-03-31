import { addUserAccount, findUserByEmail } from "@/libs/repositories/userRepository";
import { UserInputDao } from "../../models/auth/dao/userCreationModel";
import bcrypt from "bcrypt";

export async function createUser({ email, password }: UserInputDao) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    return addUserAccount({ email, hash });
}

export async function getUserByEmail(email: string) {
    const user = await findUserByEmail(email);
    return user;
}