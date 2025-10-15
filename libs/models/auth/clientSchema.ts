import { getModelForClass, pre, prop, Ref } from "@typegoose/typegoose";
import { User } from "./userSchema";
const bcrypt = require('bcryptjs');

@pre<Client>('save', async function(next){
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
    @prop({ type: () => String, required: true, unique: true })
    public _id!: string;

    @prop({ type: () => String, required: true })
    clientName!: string;
    
    @prop({ type: () => String, required: true })
    clientDescription!: string;

    @prop({ type: () => String})
    clientSecret!: string;

    @prop({ type: () => [String], required: true, default: [] })
    redirectUris!: string[];
    //grants!: string[];

    @prop({ ref: () => User, required: true, type: () => String });
    public user!: Ref<User, string>;
}

export const ClientModel = getModelForClass(Client);