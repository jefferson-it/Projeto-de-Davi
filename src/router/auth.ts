import { NextFunction, Request, Response, Router } from "express";
import { Token, User } from "../types";
import { compareSync, genSaltSync, hashSync } from "bcryptjs";
import { ObjectId } from "mongodb";
import { getCol } from "../database";
import { sign, verify } from "jsonwebtoken";

const auth = Router();
const api = Router();

// Funções 
export async function verificarToken({ _id: to, username }: Pick<User, "_id" | "username">, token: string) {
    const TokensCollection = getCol('tokens');

    const existToken = await TokensCollection.findOne({ to, token, type: 'auth' }, {
        projection: {
            token: 1,
            expires: 1
        }
    })

    if (!existToken || token !== existToken.token) return false;

    const tokenInfo = verify(token, process.env.SECRET_TOKEN as string);

    if (typeof tokenInfo === 'object') {
        const invalido = (tokenInfo.username && tokenInfo.username === username)
            && (tokenInfo.exp && tokenInfo.exp < Math.floor(Date.now() / 1000))

        if (invalido) {
            await TokensCollection.deleteOne({ to, token });

            return invalido
        }
    }

    return true;
}

// Middleware
export async function isAdminUser(req: Request, res: Response, next: NextFunction) {

    if (req.session.user) {
        const { username } = req.session.user;

        const UsersCollection = getCol('users');
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

export async function userLogged(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        const { _id, lastAccess, token, username } = req.session.user;
        const tokenValido = await verificarToken({
            _id,
            username,
        }, token);

        const diffMinutos = (Date.now() - lastAccess.getTime()) / (1000 * 60);

        if (tokenValido || diffMinutos <= 16) {
            const TokensCollection = getCol('tokens');
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
        } else {
            delete req.session.user;
        }
    }

    res.status(401).json({
        mensagem: "Você não é autorizado para acessar esta página",
        tipo: 'erro',
    })
}

export async function userNotLogged(req: Request, res: Response, next: NextFunction) {
    if (req.session.user) {
        const { _id, lastAccess, token, username } = req.session.user;
        const tokenValido = await verificarToken({
            _id,
            username,
        }, token);

        const diffMinutos = (Date.now() - lastAccess.getTime()) / (1000 * 60);

        if (tokenValido || diffMinutos <= 16) {
            const TokensCollection = getCol('tokens');
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
        } else {
            delete req.session.user;
        }
    }

    next()
}

// POST HANDLE
api.post('/login', userNotLogged, async (req, res) => {
    type formData = Omit<User, 'oc'>
    const UsersCollection = getCol('users');
    const TokensCollection = getCol('tokens');
    const { senha, username } = req.body as formData;
    const existe = await UsersCollection.findOne({ username: username.trim().toLowerCase() });

    if (!existe) {
        res.json({
            mensagem: `Usuário ${username.trim().toLowerCase()} não encontrado`,
            tipo: 'erro',
            campo: 'username'
        })
        return
    }

    else if (!compareSync(senha, existe.senha)) {
        res.json({
            mensagem: `A senha para o usuário ${username.trim().toLowerCase()} está incorreta`,
            tipo: 'erro',
            campo: 'senha'
        })
        return
    }

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

    if (quantidadeDeTokens >= 3) {
        const listaDeletar = await TokensCollection.find({ to: novoToken.to, type: 'auth' }, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(quantidadeDeTokens - 2).toArray();

        const idsParaDeletar = listaDeletar.map(t => t._id);

        await TokensCollection.deleteMany({ _id: { $in: idsParaDeletar } });
    }

    await TokensCollection.insertOne(novoToken);

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
    type formData = Omit<User, 'oc'> & {
        termos: string | boolean, // por ser checkbox por vim como 'on' ou 'off'
        confirmar_senha: string
    }
    const UsersCollection = getCol('users');
    const TokensCollection = getCol('tokens');

    // Crio um index que diz que o username deve ser uma chave única
    // Isto é, não pode haver mais de um usuário com a chave username
    UsersCollection.createIndex({ username: 1 }, { unique: true });

    // Crio aqui um index falando que após chegar a data de expiração, 
    // 15 segundos depois o banco de dados irá remover o token
    TokensCollection.createIndex({ expires: 1 }, { expireAfterSeconds: 15 });

    const { confirmar_senha, senha, termos, username } = req.body as formData;

    /**
     * Este array serve para validar os dados enviados pelo front-end no consumo da api
     */
    const validar = [
        {
            valido: !termos || termos === "off",
            message: "Você não aceitou o termos não podemos prosseguir.",
            campo: 'termos'
        },
        {
            valido: !username.trim(),
            mensagem: 'Você esqueceu de por o seu username',
            campo: 'username'
        },
        {
            valido: !senha.trim(),
            mensagem: 'Você esqueceu de por sua senha',
            campo: 'senha'
        },
        {
            valido: !confirmar_senha.trim(),
            mensagem: 'Você esqueceu de confirmar sua senha',
            campo: 'confirmar_senha'
        },
        {
            valido: senha != confirmar_senha,
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

    const novoUser: User = {
        username: username.trim().toLowerCase(),
        senha: hashSenha,
        oc: 0,
        _id: new ObjectId()
    };

    const existe = await UsersCollection.findOne({ username: novoUser.username });

    if (existe) {
        res.json({
            mensagem: `Existe um usuário cadastrado com o username ${novoUser.username}`,
            tipo: 'erro',
            campo: 'username'
        })
        return
    }

    const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
    const token = sign({ username }, process.env.SECRET_TOKEN as string, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });

    const novoToken: Token = {
        expires: expiresToken,
        to: novoUser._id,
        token,
        type: "auth",
        _id: new ObjectId()
    };

    await TokensCollection.insertOne(novoToken);
    await UsersCollection.insertOne(novoUser);

    res.json({
        tipo: 'sucesso',
        mensagem: 'Conta criada com sucesso!',
        dados: { ...novoUser, token }
    })
});

auth.use('/api', api);

export default auth;