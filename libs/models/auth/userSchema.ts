import { getModelForClass, pre, prop } from "@typegoose/typegoose";
const bcrypt = require('bcryptjs');
import { v4 as uuidv4 } from 'uuid';

@pre<User>('save', async function(next){
if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
        next();
    } catch (err) {
        if(err instanceof Error) {
            return next(err);
        }
        else {
            return next(new Error('An error occurred while hashing the password'));
        }
    }
})

export class User {
    @prop({ required: true, default: () => uuidv4() })
    public _id!: string;

    @prop({ type: () => String, required: true, unique: true })
    public email!: string;

    @prop({ type: () => String, required: true})
    public password!: string;
}

export const UserModel = getModelForClass(User);