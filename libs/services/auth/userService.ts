import { UserInputDao } from "../../models/auth/dao/userCreationModel";
import { UserModel } from "../../models/auth/userSchema";

export async function createUser({ email, password }: UserInputDao) {
    try {
        const user = new UserModel({
            username: email,
            password: password
        });
        await user.save();
    } catch (err) {
       console.error(err);
        throw err;
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