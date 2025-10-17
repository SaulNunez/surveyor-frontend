import type { Mongoose } from 'mongoose';

declare global {
    var mongoose: { 
        conn: mongoose.Mongoose | null, 
        promise: Promise<mongoose.Mongoose> | null 
    } | undefined
}

export {};