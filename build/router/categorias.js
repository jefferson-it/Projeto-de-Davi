"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// ============= [ Importações ]
const express_1 = require("express");
const mongodb_1 = require("mongodb");
const database_1 = require("../database");
const auth_1 = require("./auth");
const utils_1 = require("../utils");
// ============= [ Constantes ]
const categories = (0, express_1.Router)();
const api = (0, express_1.Router)();
const CategoriesCollection = (0, database_1.getCol)('categories');
// ============= [ GET HANDLER ]
categories.get("/cadastrar", auth_1.userLogged, auth_1.isAdminUser, (_, res) => {
    res.send((0, utils_1.getPage)('cadastrocategorias'));
});
categories.get("/editar", auth_1.userLogged, auth_1.isAdminUser, (_, res) => {
    res.send((0, utils_1.getPage)('editarcategorias'));
});
api.get('/lista', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso GET: /categorias/api/lista
    const { limite, // Limite de itens a ser obtidos (se não preenchido é 10)
    pular // Quantos itens deve pular (se não preenchido é 0)
     } = req.query; // ?limite=10&pular=10
    const lista = yield (0, database_1.getCol)('categories').find()
        .limit(Number(limite) || 10) // limita a obtenção em 10 itens
        .skip(Number(pular) || 0) // pula uma quantidade de itens
        .toArray(); // Convertendo os dados em Array
    // Entregando pro cliente os dados
    res.json(lista);
}));
api.get('/obter', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso GET: /categorias/api/obter
    const { id } = req.query; // ?id=produtos-de-limpeza
    // Obtendo o um item pelo urlId
    let item = yield (0, database_1.getCol)('categories').findOne({ urlId: id });
    if (!item) {
        // Obtendo o um item pelo _id
        item = yield (0, database_1.getCol)('categories').findOne({ _id: new mongodb_1.ObjectId(id === null || id === void 0 ? void 0 : id.toString()) });
    }
    // Entregando pro cliente o item
    res.json(item);
}));
// ============= [ POST HANDLER ]
api.post('/criar', auth_1.userLogged, auth_1.isAdminUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Pegando os dados vindo do formulário
    const { nome } = req.body;
    // ================= { Validações }
    if (!nome) {
        res.json({
            mensagem: 'Você esqueceu o nome da categoria',
            campo: 'nome',
        });
        return;
    }
    const existe = yield CategoriesCollection.findOne({ nome: nome.trim() }, { projection: { _id: 1 } });
    if (existe) {
        res.json({
            mensagem: 'Existe uma categoria com este nome',
            campo: 'nome',
        });
        return;
    }
    // Criando o URL ID do produto, através do nome
    let id = nome.trim().replace(/ /g, '-').toLowerCase();
    // Recriando o URL ID da categoria, através do nome, com prefixo aleatório, se existir uma categoria com esta URL ID
    while (yield CategoriesCollection.findOne({ urlId: id }, { projection: { _id: 1 } })) {
        let c = Math.random().toString(16).split(".").at(-1);
        id = `${nome.trim().replace(/ /g, '-').toLowerCase()}-${c}`;
    }
    // Colocando a categoria nova no Banco de Dados
    yield CategoriesCollection.insertOne({
        nome: nome.trim(),
        urlId: id,
        _id: new mongodb_1.ObjectId()
    });
    res.json({
        tipo: 'sucesso',
        mensagem: 'Categoria criada com sucesso!',
        dados: {
            nome: nome.trim(),
            urlId: id,
            _id: new mongodb_1.ObjectId().toString()
        }
    });
}));
api.post('/editar', auth_1.userLogged, auth_1.isAdminUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso POST: /categorias/api/editar
    // Pegando os dados vindo do formulário
    const { nome, urlId } = req.body;
    // ================= { Validações }
    if (!nome) {
        res.json({
            mensagem: 'Você esqueceu o nome da categoria',
            campo: 'nome',
        });
        return;
    }
    const existe = yield CategoriesCollection.findOne({ urlId }, { projection: { _id: 1 } });
    if (!existe) {
        res.json({
            mensagem: `A categoria ${urlId} não existe`,
            campo: 'urlId',
        });
        return;
    }
    const existeNome = yield CategoriesCollection.findOne({ nome: nome.trim() }, { projection: { _id: 1 } });
    if (existeNome) {
        res.json({
            mensagem: 'Existe uma categoria com este nome',
            campo: 'nome',
        });
        return;
    }
    ;
    // Atualizando a categoria
    yield CategoriesCollection.updateOne({ urlId }, { $set: { nome: nome.trim() } });
    res.json({
        tipo: 'sucesso',
        mensagem: 'Categoria editada com sucesso!',
        dados: existe
    });
}));
// ============= [ Configurando rota ]
categories.use('/api', api); // /categorias/api
exports.default = categories;
