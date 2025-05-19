// ============= [ Importações ]
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCol } from "../database";
import { isAdminUser, userLogged } from "./auth";
import { Category } from "../types";
import { getPage } from "../utils";

// ============= [ Constantes ]
const categories = Router();
const api = Router();
const CategoriesCollection = getCol('categories');

// ============= [ GET HANDLER ]
categories.get("/cadastrar", userLogged, isAdminUser, (_, res) => {
    res.send(getPage('cadastrocategorias'))
})

categories.get("/editar", userLogged, isAdminUser, (_, res) => {
    res.send(getPage('editarcategorias'))
})


api.get('/lista', async (req, res) => {
    // Acesso GET: /categorias/api/lista
    const {
        limite, // Limite de itens a ser obtidos (se não preenchido é 10)
        pular // Quantos itens deve pular (se não preenchido é 0)
    } = req.query; // ?limite=10&pular=10

    const lista = await getCol('categories').find()
        .limit(Number(limite) || 10) // limita a obtenção em 10 itens
        .skip(Number(pular) || 0) // pula uma quantidade de itens
        .toArray(); // Convertendo os dados em Array

    // Entregando pro cliente os dados
    res.json(lista);
})

api.get('/obter', async (req, res) => {
    // Acesso GET: /categorias/api/obter
    const { id } = req.query; // ?id=produtos-de-limpeza

    // Obtendo o um item pelo urlId
    let item = await getCol('categories').findOne({ urlId: id });

    if (!item) {
        // Obtendo o um item pelo _id
        item = await getCol('categories').findOne({ _id: new ObjectId(id?.toString()) });
    }

    // Entregando pro cliente o item
    res.json(item);
})


// ============= [ POST HANDLER ]
api.post('/criar', userLogged, isAdminUser, async (req, res) => {
    // Acesso POST: /categorias/api/criar
    type formData = Omit<Category, 'urlId'>;
    // Pegando os dados vindo do formulário
    const { nome } = req.body as formData;

    // ================= { Validações }
    if (!nome) {
        res.json({
            mensagem: 'Você esqueceu o nome da categoria',
            campo: 'nome',
        });

        return;
    }
    const existe = await CategoriesCollection.findOne({ nome: nome.trim() }, { projection: { _id: 1 } });

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
    while (await CategoriesCollection.findOne({ urlId: id }, { projection: { _id: 1 } })) {
        let c = Math.random().toString(16).split(".").at(-1)
        id = `${nome.trim().replace(/ /g, '-').toLowerCase()}-${c}`;
    }

    // Colocando a categoria nova no Banco de Dados
    await CategoriesCollection.insertOne({
        nome: nome.trim(),
        urlId: id,
        _id: new ObjectId()
    })

    res.json({
        tipo: 'sucesso',
        mensagem: 'Categoria criada com sucesso!',
        dados: {
            nome: nome.trim(),
            urlId: id,
            _id: new ObjectId().toString()
        }
    })
})

api.post('/editar', userLogged, isAdminUser, async (req, res) => {
    type formData = Category;
    // Acesso POST: /categorias/api/editar

    // Pegando os dados vindo do formulário
    const { nome, urlId } = req.body as formData;

    // ================= { Validações }
    if (!nome) {
        res.json({
            mensagem: 'Você esqueceu o nome da categoria',
            campo: 'nome',
        });

        return;
    }
    const existe = await CategoriesCollection.findOne({ urlId }, { projection: { _id: 1 } });

    if (!existe) {
        res.json({
            mensagem: `A categoria ${urlId} não existe`,
            campo: 'urlId',
        });

        return;
    }
    const existeNome = await CategoriesCollection.findOne({ nome: nome.trim() }, { projection: { _id: 1 } });

    if (existeNome) {
        res.json({
            mensagem: 'Existe uma categoria com este nome',
            campo: 'nome',
        });

        return;
    };

    // Atualizando a categoria
    await CategoriesCollection.updateOne({ urlId }, { $set: { nome: nome.trim() } });

    res.json({
        tipo: 'sucesso',
        mensagem: 'Categoria editada com sucesso!',
        dados: existe
    })
})

// ============= [ Configurando rota ]
categories.use('/api', api); // /categorias/api

export default categories;