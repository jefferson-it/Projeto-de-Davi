import { ObjectId } from "mongodb"

export interface RespostaAPI {
    tipo: 'erro' | 'sucesso' // tipo de mensagem
    mensagem: string, // mensagem 
    campo?: string // campo que encontrou o erro
    dados?: any // qualquer tipo
}

interface MongoData {
    _id: ObjectId | string
}

export interface User extends MongoData {
    username: string // Chave para login
    senha: string // Senha do usuário 
    oc: number // Ocupação 0 - nenhuma, 1 - adm
}

/**
 * User <1> ----- <3> Token
 */
export interface Token extends MongoData {
    to: User["_id"],
    token: string
    type: 'auth'
    expires: Date
}