import mongose from 'mongoose';

const MONGO_URI = process.env.MONGO_CONNECTION_STRING;

if (!MONGO_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise && MONGO_URI) {
    cached!.promise = mongose.connect(MONGO_URI).then((mongoose) => {
      return mongoose;
    });
  }
  cached!.conn = await cached!.promise;
  return cached!.conn;
}

export default dbConnect;