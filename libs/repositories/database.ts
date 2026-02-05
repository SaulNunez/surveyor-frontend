import { MongoClient, ServerApiVersion } from "mongodb";

const client = new MongoClient(process.env.MONGO_CONNECTION_STRING || "mongodb://localhost@surveyor:27017/",  {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    }
);

export const surveyorDb = client.db("surveyor");