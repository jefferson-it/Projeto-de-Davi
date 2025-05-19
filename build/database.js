"use strict";
// ============= [ Importações ]
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
exports.getCol = getCol;
const dotenv_1 = require("dotenv");
const mongodb_1 = require("mongodb");
(0, dotenv_1.config)(); // Lendo as variáveis de ambiente
// ============= [ Conectando ao MongoDB ]
const mongo = new mongodb_1.MongoClient(process.env.MONGO_DB); // Conectando com Mongo
mongo.connect();
exports.database = mongo.db(); // Usando o banco de dados
/**
 * @template {K extends keyof ColMap} K
 *
 * Esta função retorna a coleção solicitada
 * @param {K} col - nome da coleção
 * @returns {Collection<ColMap[K]>}
 */
function getCol(col) {
    return exports.database.collection(col); // Obtendo as coleções do banco de dados 
}
