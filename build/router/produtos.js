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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
// ============= [ Importações ]
const express_1 = require("express");
const mongodb_1 = require("mongodb");
const database_1 = require("../database");
const auth_1 = require("./auth");
const utils_1 = require("../utils");
// ============= [ Constantes ]
const products = (0, express_1.Router)();
const api = (0, express_1.Router)();
const CategoriesCollection = (0, database_1.getCol)('categories');
const ProductsCollection = (0, database_1.getCol)('products');
// ============= [ GET HANDLER ]
products.get("/cadastrar", auth_1.userLogged, auth_1.isAdminUser, (_, res) => {
    res.send((0, utils_1.getPage)('cadastroprodutos'));
});
products.get("/editar", auth_1.userLogged, auth_1.isAdminUser, (_, res) => {
    res.send((0, utils_1.getPage)('editarprodutos'));
});
api.get('/lista', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso GET: /produtos/api/list
    const { limite, // Limite de itens a ser obtidos (se não preenchido é 10)
    pular // Quantos itens deve pular (se não preenchido é 0)
     } = req.query; // ?limite=10&pular=10
    // Obtendo lista de produtos
    const lista = yield (0, database_1.getCol)('products').find()
        .limit(Number(limite) || 10) // limita a obtenção em 10 itens
        .skip(Number(pular) || 0) // pula uma quantidade de itens
        .toArray(); // Convertendo os dados em Array
    // Entregando pro cliente os dados
    res.json(lista);
}));
api.get('/obter', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso GET: /produtos/api/one
    const { id } = req.query; // ?id=esponja
    // Obtendo o um item pelo urlId
    let item = yield (0, database_1.getCol)('products').findOne({ urlId: id });
    if (!item) {
        // Obtendo o um item pelo _id
        try {
            item = yield (0, database_1.getCol)('products').findOne({ _id: new mongodb_1.ObjectId(id === null || id === void 0 ? void 0 : id.toString()) });
        }
        catch (error) {
            item = null;
        }
    }
    // Entregando pro cliente o item
    res.json(item || {});
}));
// ============= [ POST HANDLER ]
api.post('/criar', auth_1.userLogged, auth_1.isAdminUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso POST: /produtos/api/create
    // Pegando os dados vindo do formulário
    const { nome: nomeOriginal, categoria: categoriaOriginal, quantidade: qtdOriginal, desc: descOriginal, preco: precoOriginal, icone } = req.body;
    const nome = nomeOriginal.trim(); // Removendo sobras ex.: "Nome " -> "Nome" 
    const categoria = categoriaOriginal.trim(); // Removendo sobras ex.: "Nome " -> "Nome"
    const desc = descOriginal.trim(); // Removendo sobras ex.: "Nome " -> "Nome"
    const preco = Number(precoOriginal); // Transforma em Numero
    const quantidade = Number(qtdOriginal.toString().trim());
    // Array que irá validar os dados que vieram do formulário
    const validar = [
        {
            valido: nome,
            mensagem: "Você esqueceu o nome do produto.",
            campo: 'nome'
        },
        {
            valido: categoria,
            mensagem: "Você esqueceu o nome da categoria.",
            campo: 'categoria'
        },
        {
            valido: desc,
            mensagem: "Não colocou a descrição do produto.",
            campo: 'desc'
        },
        {
            valido: desc.length > 10,
            mensagem: "Descrição muito curta, coloque pelo menos 10 caracteres.",
            campo: 'desc'
        },
        {
            valido: preco,
            mensagem: "Não colocou o preço do produto.",
            campo: 'preco'
        },
        {
            valido: preco > 0,
            mensagem: `O preço ${(0, utils_1.toBRL)(preco)} é invalido.`,
            campo: 'preco'
        },
        {
            valido: !(yield ProductsCollection.findOne({ nome }, { projection: { _id: 1 } })),
            mensagem: `Existe um produto com o nome ${nome}.`,
            campo: 'nome'
        },
        {
            valido: icone,
            mensagem: "Este produto está sem imagem",
            campo: "icone"
        },
        {
            valido: /^data:image\/[a-zA-Z]+;base64,/.test(icone),
            mensagem: "Imagem ou arquivo invalido",
            campo: "icone"
        },
        {
            valido: quantidade >= 0,
            mensagem: "Quantidade invalida",
            campo: "quantidade"
        }
    ];
    // Mapeando o array e verificando
    for (let _a of validar) {
        const { valido } = _a, mensagem = __rest(_a, ["valido"]);
        if (!valido) {
            res.json(Object.assign(Object.assign({}, mensagem), { tipo: 'erro' }));
            return;
        }
    }
    // Pesquisando a categoria alvo, e se não existir retornar um erro
    const categoriaAlvo = yield CategoriesCollection.findOne({ nome: categoria }, { projection: { _id: 1 } });
    if (!categoriaAlvo) {
        res.json({
            mensagem: `A categoria ${categoria} não existe.`,
            campo: 'categoria'
        });
        return;
    }
    // Criando o URL ID do produto, através do nome
    let urlId = nome.trim().replace(/ /g, '-').toLowerCase();
    // Recriando o URL ID do produto, através do nome, com prefixo aleatório, se existir um produto com esta URL ID
    while (yield ProductsCollection.findOne({ urlId: urlId }, { projection: { _id: 1 } })) {
        let c = Math.random().toString(16).split(".").at(-1);
        urlId = `${nome.trim().replace(/ /g, '-').toLowerCase()}-${c}`;
    }
    // Criando o novo produto
    const novoProduto = {
        nome,
        urlId,
        categoria: categoriaAlvo._id,
        preco,
        desc,
        quantidade,
        _id: new mongodb_1.ObjectId()
    };
    // Salvando imagem 
    if (!(0, utils_1.saveBase64File)(icone, `${urlId}.webp`)) {
        res.json({
            tipo: 'error',
            mensagem: 'Erro ao salvar a imagem'
        });
        return;
    }
    // Inserindo no banco de dadso
    yield ProductsCollection.insertOne(novoProduto);
    res.json({
        tipo: 'sucesso',
        mensagem: 'Produto criada com sucesso!',
        dados: novoProduto
    });
}));
api.post('/editar', auth_1.userLogged, auth_1.isAdminUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Acesso POST: /produtos/api/edit
    // Pegando os dados vindo do formulário
    const { nome: nomeOriginal, urlId, categoria: categoriaOriginal, quantidade: qtdOriginal, desc, preco: precoOriginal, icone } = req.body;
    // Pegando o item
    const existe = yield ProductsCollection.findOne({ urlId }, { projection: { _id: 1 } });
    if (!existe) {
        res.json({
            mensagem: `O produto ${urlId} não existe`,
            campo: 'urlId',
        });
        return;
    }
    console.log(req.body);
    // Constante    
    const $set = {};
    const nome = nomeOriginal.trim();
    const categoria = categoriaOriginal.trim();
    const preco = Number(precoOriginal); // Transforma em Numero
    const quantidade = Number(qtdOriginal.toString().trim());
    // Array que irá validar os dados que vieram do formulário
    const validar = [
        {
            valido: nome,
            mensagem: "Você esqueceu o nome do produto.",
            campo: 'nome',
            valor: nome,
        },
        {
            valido: (() => __awaiter(void 0, void 0, void 0, function* () {
                const ex = yield ProductsCollection.findOne({ nome }, { projection: { _id: 1 } });
                return (ex === null || ex === void 0 ? void 0 : ex._id.toString()) !== existe._id.toString();
            }))(),
            mensagem: `Existe um produto com o nome ${nome}.`,
            campo: 'nome',
            valor: nome,
        },
        {
            valido: categoria,
            mensagem: "Você esqueceu o nome da categoria.",
            campo: 'categoria',
            valor: categoria,
        },
        {
            valido: desc,
            mensagem: "Não colocou a descrição do produto.",
            campo: 'desc',
            valor: desc,
        },
        {
            valido: desc.length >= 10,
            mensagem: "Descrição muito curta, coloque pelo menos 10 caracteres.",
            campo: 'desc',
            valor: desc,
        },
        {
            valido: preco,
            mensagem: "Não colocou o preço do produto.",
            campo: 'preco',
            valor: preco,
        },
        {
            valido: preco > 0,
            mensagem: `O preço ${(0, utils_1.toBRL)(preco)} é invalido.`,
            campo: 'preco',
            valor: preco,
        },
        {
            valido: icone ? /^data:image\/[a-zA-Z]+;base64,/.test(icone) : true,
            mensagem: "Imagem ou arquivo invalido",
            campo: "icone",
            valor: null
        },
        {
            valido: quantidade >= 0,
            mensagem: "Quantidade invalida",
            campo: "quantidade",
            valor: preco
        }
    ];
    // Mapeando o array e verificando
    for (const { valido, mensagem, campo, valor } of validar) {
        if (!valido) {
            res.json({
                mensagem,
                campo,
                tipo: 'erro'
            });
            return;
        }
        if (existe[campo] !== valor && valor !== null) {
            $set[campo] = valor;
        }
    }
    // Pesquisando a categoria alvo, e se não existir retornar um erro
    const categoriaAlvo = yield CategoriesCollection.findOne({ nome: categoria }, { projection: { _id: 1 } });
    if (!categoriaAlvo) {
        res.json({
            message: `A categoria ${categoria} não existe.`,
            campo: 'categoria'
        });
        return;
    }
    // Salvando imagem 
    if (!(0, utils_1.saveBase64File)(icone, `${urlId}.webp`)) {
        res.json({
            tipo: 'error',
            mensagem: 'Erro ao salvar a imagem'
        });
        return;
    }
    // Atualizando o item
    yield ProductsCollection.updateOne({ urlId }, { $set });
    res.json({
        tipo: 'sucesso',
        mensagem: 'Produto criado com sucesso!',
        dados: Object.assign(Object.assign({}, existe), $set)
    });
}));
// ============= [ Configurando rota ]
products.use('/api', api); // /produtos/api
exports.default = products;
