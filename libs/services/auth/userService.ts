import { UserInputDao } from "../../models/auth/dao/userCreationModel";
import { UserModel } from "../../models/auth/userSchema";

export async function createUser({ email, password }: UserInputDao) {
    try {
        const user = new UserModel({
            username: email,
            password: password
        });
        await user.save();
        return true;
    } catch (err) {
        return false;
    }
}

export async function getUserByEmail(email: string) {
    try {
        const user = await UserModel.findOne({ email }).exec();
        return user;
    } catch (err) {
        throw err;
    }
}