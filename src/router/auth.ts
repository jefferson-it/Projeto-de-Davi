// ============= [ Importações ]
import { NextFunction, Request, Response, Router } from "express";
import { Token, User } from "../types";
import { compareSync, genSaltSync, hashSync } from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCol } from "../database";
import { sign, verify } from "jsonwebtoken";
import { config } from "dotenv";

config(); // Lendo as variáveis de ambiente

// ============= [ Constantes ]
const auth = Router();
const api = Router();

const TokensCollection = getCol('tokens');
const UsersCollection = getCol('users');

// ============= [ Definição de INDEXES ]

// Crio um index que diz que o username deve ser uma chave única
// Isto é, não pode haver mais de um usuário com a chave username
UsersCollection.createIndex({ username: 1 }, { unique: true });

// Crio aqui um index falando que após chegar a data de expiração, 
// 15 segundos depois o banco de dados irá remover o token
TokensCollection.createIndex({ expires: 1 }, { expireAfterSeconds: 15 });

// ============= [ Funções ]

/**
 * Verifica e valida o token do usuário e verifica se este token é valido
 * 
 * Sendo a primeira etapa se este token está no banco de dados
 * e depois passando para validação do `verify` que é da biblioteca do `jsonwebtoken`
 * 
 * Se o token expirou ele é invalido e se não for o mesmo username
 * 
 * @param {Pick<User, "_id" | "username">} param0 
 * @param {string} token 
 * @returns {Promise<boolean>}
 */
export async function verificarToken({ _id: to, username }: Pick<User, "_id" | "username">, token: string): Promise<boolean> {
    const existToken = await TokensCollection.findOne({ to, token, type: 'auth' }, {
        projection: {
            token: 1,
            expires: 1
        }
    })

    if (!existToken || token !== existToken.token) return false;

    const tokenInfo = verify(token, process.env.SECRET_TOKEN as string);

    if (typeof tokenInfo === 'object') {
        const expirado = (tokenInfo.exp && tokenInfo.exp < Math.floor(Date.now() / 1000));
        const mesmoUsername = (tokenInfo.username && tokenInfo.username === username);
        const invalido = mesmoUsername && expirado

        if (expirado) {
            await TokensCollection.deleteOne({ to, token });

            return false
        }

        return !invalido
    }

    return true;
}

// ============= [ Middleware ]
/**
 * Este Middleware verifica se o usuário é um administrador
 * 
 * Se não for ele retorna o status 401
 * @param req - requisições 
 * @param res - resposta
 * @param next - avançar pra rota
 * @returns 
 */
export async function isAdminUser(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        const { username } = req.session.user;

        const user = await UsersCollection.findOne({ username }, { projection: { oc: 1 } });

        if (user?.oc === 1) {
            return next();
        }
    } else {
        delete req.session.user;
    }

    res.status(401).json({
        mensagem: "Você não é autorizado para acessar esta página",
        tipo: 'erro',
    })
}

/**
 * Este Middleware verifica se o usuário está logado
 * 
 * Se não estiver ele retorna o status 401
 * @param req - requisições 
 * @param res - resposta
 * @param next - avançar pra rota
 * @returns 
 */
export async function userLogged(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        const { _id, lastAccess, token, username } = req.session.user;
        const tokenValido = await verificarToken({
            _id,
            username,
        }, token);

        const diffMinutos = (Date.now() - new Date(lastAccess.toString()).getTime()) / (1000 * 60);

        if (!tokenValido && diffMinutos <= 16) {
            const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
            const token = sign({ username }, process.env.SECRET_TOKEN as string, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });

            const novoToken: Token = {
                expires: expiresToken,
                to: _id,
                token,
                type: "auth",
                _id: new ObjectId()
            };

            await TokensCollection.insertOne(novoToken);

            req.session.user = {
                ...req.session.user,
                lastAccess: new Date(),
                token
            }

            next();
            return
        } else if (tokenValido) {
            next()
            return
        } else {
            delete req.session.user;
        }
    }

    res.status(401).json({
        mensagem: "Você não é autorizado para acessar esta página",
        tipo: 'erro',
    })
}

/**
 * Este Middleware verifica se o usuário NÃO está logado
 * 
 * Se estiver ele retorna o status 403
 * @param req - requisições 
 * @param res - resposta
 * @param next - avançar pra rota
 * @returns 
 */
export async function userNotLogged(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        const { _id, lastAccess, token, username } = req.session.user;
        const tokenValido = await verificarToken({
            _id,
            username,
        }, token);

        const diffMinutos = (Date.now() - new Date(lastAccess.toString()).getTime()) / (1000 * 60);

        if (!tokenValido && diffMinutos <= 16) {
            const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
            const token = sign({ username }, process.env.SECRET_TOKEN as string, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });

            const novoToken: Token = {
                expires: expiresToken,
                to: _id,
                token,
                type: "auth",
                _id: new ObjectId()
            };

            await TokensCollection.insertOne(novoToken);

            req.session.user = {
                ...req.session.user,
                lastAccess: new Date(),
                token
            }

            res.status(403).json({
                mensagem: "Esta página é para usuários não autenticados",
                tipo: 'erro',
            })
            return
        } else if (tokenValido) {
            res.status(403).json({
                mensagem: "Esta página é para usuários não autenticados",
                tipo: 'erro',
            })
            return
        } else {
            delete req.session.user;
        }
    }

    next()
}


// ============= [ GET HANDLER ]
api.get('/get-state', async (req, res) => {
    // Access GET: /auth/api/get-state

    // Esta rota para obter os dados do usuário logado 
    if (req.session.user) {
        // Obtendo o usuário
        const user = await UsersCollection.findOne({
            _id: new ObjectId(req.session.user._id)
        }, {
            projection: {
                senha: 0
            }
        });

        res.json(user);
        return;
    }

    res.json({})
})


// ============= [ POST HANDLER ]
api.post('/login', userNotLogged, async (req, res) => {
    // Access POST: /auth/api/login
    type formData = Omit<User, 'oc'>

    // Pegando os dados vindo do formulário
    const { senha, username } = req.body as formData;

    // ================= { Validações }
    const existe = await UsersCollection.findOne({ username: username.trim().toLowerCase() });

    if (!existe) {
        res.json({
            mensagem: `Usuário ${username.trim().toLowerCase()} não encontrado`,
            tipo: 'erro',
            campo: 'username'
        })
        return
    }

    // Aqui compara o hash e a senha, se não der certo a senha é incorreta
    else if (!compareSync(senha, existe.senha)) {
        res.json({
            mensagem: `A senha para o usuário ${username.trim().toLowerCase()} está incorreta`,
            tipo: 'erro',
            campo: 'senha'
        })
        return
    }

    // Gerando token de autenticação
    const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
    const token = sign({ username }, process.env.SECRET_TOKEN as string, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });

    const novoToken: Token = {
        expires: expiresToken,
        to: existe._id,
        token,
        type: "auth",
        _id: new ObjectId()
    };

    const quantidadeDeTokens = await TokensCollection.countDocuments({ to: novoToken.to, type: 'auth' });

    // Deletando tokens excessivos 
    if (quantidadeDeTokens >= 3) {
        const listaDeletar = await TokensCollection.find({ to: novoToken.to, type: 'auth' }, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(quantidadeDeTokens - 2).toArray();

        const idsParaDeletar = listaDeletar.map(t => t._id);

        await TokensCollection.deleteMany({ _id: { $in: idsParaDeletar } });
    }

    // Guardando token no db
    await TokensCollection.insertOne(novoToken);

    // Registrando token na sessão
    req.session.user = {
        _id: existe._id,
        lastAccess: new Date(),
        token: token,
        username: existe.username
    }

    res.json({
        tipo: 'sucesso',
        mensagem: 'Bem vindo de volta!',
        dados: existe
    })
});

api.post('/registrar', userNotLogged, async (req, res) => {
    // Access POST: /auth/api/registrar

    type formData = Omit<User, 'oc'> & {
        termos: string | boolean, // por ser checkbox por vim como 'on' ou 'off'
        confirmar_senha: string
    }

    // Pegando os dados vindo do formulário
    const { confirmar_senha, senha, username } = req.body as formData;

    /**
     * Este array serve para validar os dados enviados pelo front-end no consumo da api
     */
    const validar = [
        {
            valido: username.trim(),
            mensagem: 'Você esqueceu de por o seu username',
            campo: 'username'
        },
        {
            valido: senha.trim(),
            mensagem: 'Você esqueceu de por sua senha',
            campo: 'senha'
        },
        {
            valido: confirmar_senha.trim(),
            mensagem: 'Você esqueceu de confirmar sua senha',
            campo: 'confirmar_senha'
        },
        {
            valido: senha === confirmar_senha,
            mensagem: 'As senhas são diferentes',
            campo: 'confirmar_senha,senha'
        },
    ];

    for (const { valido, ...mensagem } of validar) {
        if (!valido) {
            res.json({
                ...mensagem,
                tipo: 'erro'
            })
            return
        }
    }

    // Aqui pegamos a senha original e criptografamos  
    // ex.: '123' -> '$2b$10...'
    const hashSenha = hashSync(senha.trim(), genSaltSync(10));

    // Criando o novo usuário
    const novoUser: User = {
        username: username.trim().toLowerCase(),
        senha: hashSenha,
        oc: 0,
        _id: new ObjectId()
    };

    // Verificando a existência
    const existe = await UsersCollection.findOne({ username: novoUser.username });

    if (existe) {
        res.json({
            mensagem: `Existe um usuário cadastrado com o username ${novoUser.username}`,
            tipo: 'erro',
            campo: 'username'
        })
        return
    }

    // Gerando token de autenticação
    const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
    const token = sign({ username }, process.env.SECRET_TOKEN as string, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });

    const novoToken: Token = {
        expires: expiresToken,
        to: novoUser._id,
        token,
        type: "auth",
        _id: new ObjectId()
    };

    // Salvando dados no banco de dado
    await TokensCollection.insertOne(novoToken);
    await UsersCollection.insertOne(novoUser);

    req.session.user = {
        _id: novoUser._id,
        lastAccess: new Date(),
        token: token,
        username: novoUser.username
    }


    res.json({
        tipo: 'sucesso',
        mensagem: 'Conta criada com sucesso!',
        dados: { ...novoUser, token }
    })
});

// ============= [ Configurando rota ]
auth.use('/api', api); // /auth/

export default auth;