// ============= [ Importações ]
import { Router } from "express";
import { ObjectId } from "mongodb";
import { getCol } from "../database";
import { isAdminUser, userLogged } from "./auth";
import { Product } from "../types";
import { getPage, saveBase64File, toBRL } from "../utils";

// ============= [ Constantes ]
const products = Router();
const api = Router();

const CategoriesCollection = getCol('categories');
const ProductsCollection = getCol('products');

// ============= [ GET HANDLER ]
products.get("/cadastrar", userLogged, isAdminUser, (_, res) => {
    res.send(getPage('cadastroprodutos'))
})

products.get("/editar", userLogged, isAdminUser, (_, res) => {
    res.send(getPage('editarprodutos'))
})

api.get('/lista', async (req, res) => {
    // Acesso GET: /produtos/api/list
    const {
        limite, // Limite de itens a ser obtidos (se não preenchido é 10)
        pular // Quantos itens deve pular (se não preenchido é 0)
    } = req.query; // ?limite=10&pular=10


    // Obtendo lista de produtos
    const lista = await getCol('products').find()
        .limit(Number(limite) || 10) // limita a obtenção em 10 itens
        .skip(Number(pular) || 0) // pula uma quantidade de itens
        .toArray(); // Convertendo os dados em Array

    // Entregando pro cliente os dados
    res.json(lista);
})

api.get('/obter', async (req, res) => {
    // Acesso GET: /produtos/api/one
    const { id } = req.query; // ?id=esponja

    // Obtendo o um item pelo urlId
    let item = await getCol('products').findOne({ urlId: id });

    if (!item) {
        // Obtendo o um item pelo _id
        try {
            item = await getCol('products').findOne({ _id: new ObjectId(id?.toString()) });

        } catch (error) {
            item = null;
        }
    }

    // Entregando pro cliente o item
    res.json(item || {});
})

// ============= [ POST HANDLER ]
api.post('/criar', userLogged, isAdminUser, async (req, res) => {
    // Acesso POST: /produtos/api/create

    type formData = Omit<Product, 'urlId' | "categoria"> & {
        categoria: string,
        icone: string
    };

    // Pegando os dados vindo do formulário
    const { nome: nomeOriginal, categoria: categoriaOriginal, quantidade: qtdOriginal, desc: descOriginal, preco: precoOriginal, icone } = req.body as formData;
    const nome = nomeOriginal.trim(); // Removendo sobras ex.: "Nome " -> "Nome" 
    const categoria = categoriaOriginal.trim(); // Removendo sobras ex.: "Nome " -> "Nome"
    const desc = descOriginal.trim(); // Removendo sobras ex.: "Nome " -> "Nome"
    const preco = Number(precoOriginal); // Transforma em Numero
    const quantidade = Number(qtdOriginal.toString().trim())

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
            mensagem: `O preço ${toBRL(preco)} é invalido.`,
            campo: 'preco'
        },
        {
            valido: !await ProductsCollection.findOne({ nome }, { projection: { _id: 1 } }),
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
    for (const { valido, ...mensagem } of validar) {
        if (!valido) {
            res.json({
                ...mensagem,
                tipo: 'erro'
            })
            return
        }
    }

    // Pesquisando a categoria alvo, e se não existir retornar um erro
    const categoriaAlvo = await CategoriesCollection.findOne({ nome: categoria }, { projection: { _id: 1 } });

    if (!categoriaAlvo) {
        res.json({
            mensagem: `A categoria ${categoria} não existe.`,
            campo: 'categoria'
        })
        return
    }

    // Criando o URL ID do produto, através do nome
    let urlId = nome.trim().replace(/ /g, '-').toLowerCase();

    // Recriando o URL ID do produto, através do nome, com prefixo aleatório, se existir um produto com esta URL ID
    while (await ProductsCollection.findOne({ urlId: urlId }, { projection: { _id: 1 } })) {
        let c = Math.random().toString(16).split(".").at(-1)
        urlId = `${nome.trim().replace(/ /g, '-').toLowerCase()}-${c}`;
    }

    // Criando o novo produto
    const novoProduto: Product = {
        nome,
        urlId,
        categoria: categoriaAlvo._id,
        preco,
        desc,
        quantidade,
        _id: new ObjectId()
    }

    // Salvando imagem 
    if (!saveBase64File(icone, `${urlId}.webp`)) {
        res.json({
            tipo: 'error',
            mensagem: 'Erro ao salvar a imagem'
        })
        return
    }

    // Inserindo no banco de dadso
    await ProductsCollection.insertOne(novoProduto)


    res.json({
        tipo: 'sucesso',
        mensagem: 'Produto criada com sucesso!',
        dados: novoProduto
    })
})

api.post('/editar', userLogged, isAdminUser, async (req, res) => {
    // Acesso POST: /produtos/api/edit

    type formData = Omit<Product, "categoria"> & {
        categoria: string,
        icone: string,
    };

    // Pegando os dados vindo do formulário
    const { nome: nomeOriginal, urlId, categoria: categoriaOriginal, quantidade: qtdOriginal, desc, preco: precoOriginal, icone } = req.body as formData;



    // Pegando o item
    const existe = await ProductsCollection.findOne({ urlId }, { projection: { _id: 1 } });

    if (!existe) {
        res.json({
            mensagem: `O produto ${urlId} não existe`,
            campo: 'urlId',
        });

        return;
    }

    // Constante    
    const $set = {};
    const nome = nomeOriginal.trim();
    const categoria = categoriaOriginal.trim()
    const preco = Number(precoOriginal); // Transforma em Numero
    const quantidade = Number(qtdOriginal.toString().trim())

    // Array que irá validar os dados que vieram do formulário
    const validar = [
        {
            valido: nome,
            mensagem: "Você esqueceu o nome do produto.",
            campo: 'nome',
            valor: nome,
        },
        {
            valido: (async () => {
                const ex = await ProductsCollection.findOne({ nome }, { projection: { _id: 1 } });

                return ex?._id.toString() !== existe._id.toString()
            })(),
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
            mensagem: `O preço ${toBRL(preco)} é invalido.`,
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
            })
            return
        }

        if ((existe as any)[campo] !== valor && valor !== null) {
            ($set as any)[campo] = valor
        }
    }

    // Pesquisando a categoria alvo, e se não existir retornar um erro
    const categoriaAlvo = await CategoriesCollection.findOne({ nome: categoria }, { projection: { _id: 1 } });

    if (!categoriaAlvo) {
        res.json({
            message: `A categoria ${categoria} não existe.`,
            campo: 'categoria'
        })
        return
    }

    if (($set as any).categoria) ($set as any)['categoria'] = categoriaAlvo._id

    // Salvando imagem 
    if (icone) {
        if (!saveBase64File(icone, `${urlId}.webp`)) {
            res.json({
                tipo: 'error',
                mensagem: 'Erro ao salvar a imagem'
            })
            return
        }
    }
    // Atualizando o item
    await ProductsCollection.updateOne({ urlId }, { $set });

    res.json({
        tipo: 'sucesso',
        mensagem: 'Produto editado com sucesso!',
        dados: { ...existe, ...$set }
    })
})

// ============= [ Configurando rota ]
products.use('/api', api); // /produtos/api

export default products;