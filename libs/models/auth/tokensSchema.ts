import * as typegoose from "@typegoose/typegoose";
import { User } from "./userSchema";
import { Client } from "./clientSchema";
const bcrypt = require('bcryptjs');

@typegoose.pre<RefreshToken>('save', async function(next){
if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.token, salt);
        this.token = hash;
        next();
    } catch (err) {
        if(err instanceof Error) {
            return next(err);
        }
        else {
            return next(new Error('An error occurred while hashing the token'));
        }
    }
})

export class RefreshToken {
    @typegoose.prop({ required: true})
    public token!: string;

    @typegoose.prop({ required: true, ref: () => User, type: () => String})
    public userId!: typegoose.Ref<User, string>;

    @typegoose.prop({ required: true})
    public expiryDate!: Date;

    @typegoose.prop({ required: true, ref: () => Client, type: () => String})
    public clientId!: typegoose.Ref<Client, string>;
}

export const RefreshTokenModel = typegoose.getModelForClass(RefreshToken)