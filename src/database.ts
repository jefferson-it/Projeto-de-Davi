import { config } from "dotenv"
import { Collection, MongoClient } from "mongodb"
import { Token, User } from "./types";

config()

const mongo = new MongoClient(process.env.MONGO_DB as string);

mongo.connect();

export const database = mongo.db();

interface ColMap {
    users: User
    tokens: Token
}

export function getCol<K extends keyof ColMap>(col: K): Collection<ColMap[K]> {
    return database.collection(col)
}