// ============= [ Importações ]

import { config } from "dotenv"
import { Collection, MongoClient } from "mongodb"
import { Category, Product, Token, User } from "./types";

config() // Lendo as variáveis de ambiente

// ============= [ Conectando ao MongoDB ]

const mongo = new MongoClient(process.env.MONGO_DB as string); // Conectando com Mongo

mongo.connect();

export const database = mongo.db(); // Usando o banco de dados

// Interface para mapear as coleções usada na aplicação
interface ColMap {
    users: User
    tokens: Token
    categories: Category
    products: Product
    reports: Report
}

/**
 * @template {K extends keyof ColMap} K 
 * 
 * Esta função retorna a coleção solicitada
 * @param {K} col - nome da coleção
 * @returns {Collection<ColMap[K]>}
 */
export function getCol<K extends keyof ColMap>(col: K): Collection<ColMap[K]> {
    return database.collection(col) // Obtendo as coleções do banco de dados 
}