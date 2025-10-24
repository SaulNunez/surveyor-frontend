import * as typegoose from "@typegoose/typegoose";
import { User } from "./userSchema";
import bcrypt from "bcrypt";

@typegoose.pre<Client>('save', async function(next){
if (!this.isModified("clientSecret")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.clientSecret, salt);
        this.clientSecret = hash;
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

export class Client {
    @typegoose.prop({ type: () => String, required: true, unique: true })
    public _id!: string;

    @typegoose.prop({ type: () => String, required: true })
    clientName!: string;
    
    @typegoose.prop({ type: () => String, required: true })
    clientDescription!: string;

    @typegoose.prop({ type: () => String})
    clientSecret!: string;

    @typegoose.prop({ type: () => [String], required: true, default: [] })
    redirectUris!: string[];
    //grants!: string[];

    @typegoose.prop({ ref: () => User, required: true, type: () => String })
    public user!: typegoose.Ref<User, string>;
}

export const ClientModel = typegoose.getModelForClass(Client);