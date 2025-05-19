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
exports.verificarToken = verificarToken;
exports.isAdminUser = isAdminUser;
exports.userLogged = userLogged;
exports.userNotLogged = userNotLogged;
// ============= [ Importações ]
const express_1 = require("express");
const bcryptjs_1 = require("bcryptjs");
const mongodb_1 = require("mongodb");
const database_1 = require("../database");
const jsonwebtoken_1 = require("jsonwebtoken");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)(); // Lendo as variáveis de ambiente
// ============= [ Constantes ]
const auth = (0, express_1.Router)();
const api = (0, express_1.Router)();
const TokensCollection = (0, database_1.getCol)('tokens');
const UsersCollection = (0, database_1.getCol)('users');
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
function verificarToken(_a, token_1) {
    return __awaiter(this, arguments, void 0, function* ({ _id: to, username }, token) {
        const existToken = yield TokensCollection.findOne({ to, token, type: 'auth' }, {
            projection: {
                token: 1,
                expires: 1
            }
        });
        if (!existToken || token !== existToken.token)
            return false;
        const tokenInfo = (0, jsonwebtoken_1.verify)(token, process.env.SECRET_TOKEN);
        if (typeof tokenInfo === 'object') {
            const expirado = (tokenInfo.exp && tokenInfo.exp < Math.floor(Date.now() / 1000));
            const mesmoUsername = (tokenInfo.username && tokenInfo.username === username);
            const invalido = mesmoUsername && expirado;
            if (expirado) {
                yield TokensCollection.deleteOne({ to, token });
                return false;
            }
            return !invalido;
        }
        return true;
    });
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
function isAdminUser(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.session.user) {
            const { username } = req.session.user;
            const user = yield UsersCollection.findOne({ username }, { projection: { oc: 1 } });
            if ((user === null || user === void 0 ? void 0 : user.oc) === 1) {
                return next();
            }
        }
        else {
            delete req.session.user;
        }
        res.status(401).json({
            mensagem: "Você não é autorizado para acessar esta página",
            tipo: 'erro',
        });
    });
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
function userLogged(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.session.user) {
            const { _id, lastAccess, token, username } = req.session.user;
            const tokenValido = yield verificarToken({
                _id,
                username,
            }, token);
            const diffMinutos = (Date.now() - new Date(lastAccess.toString()).getTime()) / (1000 * 60);
            if (!tokenValido && diffMinutos <= 16) {
                const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
                const token = (0, jsonwebtoken_1.sign)({ username }, process.env.SECRET_TOKEN, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });
                const novoToken = {
                    expires: expiresToken,
                    to: _id,
                    token,
                    type: "auth",
                    _id: new mongodb_1.ObjectId()
                };
                yield TokensCollection.insertOne(novoToken);
                req.session.user = Object.assign(Object.assign({}, req.session.user), { lastAccess: new Date(), token });
                next();
                return;
            }
            else if (tokenValido) {
                next();
                return;
            }
            else {
                delete req.session.user;
            }
        }
        res.status(401).json({
            mensagem: "Você não é autorizado para acessar esta página",
            tipo: 'erro',
        });
    });
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
function userNotLogged(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (req.session.user) {
            const { _id, lastAccess, token, username } = req.session.user;
            const tokenValido = yield verificarToken({
                _id,
                username,
            }, token);
            const diffMinutos = (Date.now() - new Date(lastAccess.toString()).getTime()) / (1000 * 60);
            if (!tokenValido && diffMinutos <= 16) {
                const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
                const token = (0, jsonwebtoken_1.sign)({ username }, process.env.SECRET_TOKEN, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });
                const novoToken = {
                    expires: expiresToken,
                    to: _id,
                    token,
                    type: "auth",
                    _id: new mongodb_1.ObjectId()
                };
                yield TokensCollection.insertOne(novoToken);
                req.session.user = Object.assign(Object.assign({}, req.session.user), { lastAccess: new Date(), token });
                res.status(403).json({
                    mensagem: "Esta página é para usuários não autenticados",
                    tipo: 'erro',
                });
                return;
            }
            else if (tokenValido) {
                res.status(403).json({
                    mensagem: "Esta página é para usuários não autenticados",
                    tipo: 'erro',
                });
                return;
            }
            else {
                delete req.session.user;
            }
        }
        next();
    });
}
// ============= [ GET HANDLER ]
api.get('/get-state', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Access GET: /auth/api/get-state
    // Esta rota para obter os dados do usuário logado 
    if (req.session.user) {
        // Obtendo o usuário
        const user = yield UsersCollection.findOne({
            _id: req.session.user._id
        }, {
            projection: {
                senha: 0
            }
        });
        res.json(user);
        return;
    }
    res.json({});
}));
// ============= [ POST HANDLER ]
api.post('/login', userNotLogged, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Pegando os dados vindo do formulário
    const { senha, username } = req.body;
    // ================= { Validações }
    const existe = yield UsersCollection.findOne({ username: username.trim().toLowerCase() });
    if (!existe) {
        res.json({
            mensagem: `Usuário ${username.trim().toLowerCase()} não encontrado`,
            tipo: 'erro',
            campo: 'username'
        });
        return;
    }
    // Aqui compara o hash e a senha, se não der certo a senha é incorreta
    else if (!(0, bcryptjs_1.compareSync)(senha, existe.senha)) {
        res.json({
            mensagem: `A senha para o usuário ${username.trim().toLowerCase()} está incorreta`,
            tipo: 'erro',
            campo: 'senha'
        });
        return;
    }
    // Gerando token de autenticação
    const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
    const token = (0, jsonwebtoken_1.sign)({ username }, process.env.SECRET_TOKEN, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });
    const novoToken = {
        expires: expiresToken,
        to: existe._id,
        token,
        type: "auth",
        _id: new mongodb_1.ObjectId()
    };
    const quantidadeDeTokens = yield TokensCollection.countDocuments({ to: novoToken.to, type: 'auth' });
    // Deletando tokens excessivos 
    if (quantidadeDeTokens >= 3) {
        const listaDeletar = yield TokensCollection.find({ to: novoToken.to, type: 'auth' }, { projection: { _id: 1 } }).sort({ _id: 1 }).limit(quantidadeDeTokens - 2).toArray();
        const idsParaDeletar = listaDeletar.map(t => t._id);
        yield TokensCollection.deleteMany({ _id: { $in: idsParaDeletar } });
    }
    // Guardando token no db
    yield TokensCollection.insertOne(novoToken);
    // Registrando token na sessão
    req.session.user = {
        _id: existe._id,
        lastAccess: new Date(),
        token: token,
        username: existe.username
    };
    res.json({
        tipo: 'sucesso',
        mensagem: 'Bem vindo de volta!',
        dados: existe
    });
}));
api.post('/registrar', userNotLogged, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // Access POST: /auth/api/registrar
    // Pegando os dados vindo do formulário
    const { confirmar_senha, senha, username } = req.body;
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
    for (let _a of validar) {
        const { valido } = _a, mensagem = __rest(_a, ["valido"]);
        if (!valido) {
            res.json(Object.assign(Object.assign({}, mensagem), { tipo: 'erro' }));
            return;
        }
    }
    // Aqui pegamos a senha original e criptografamos  
    // ex.: '123' -> '$2b$10...'
    const hashSenha = (0, bcryptjs_1.hashSync)(senha.trim(), (0, bcryptjs_1.genSaltSync)(10));
    // Criando o novo usuário
    const novoUser = {
        username: username.trim().toLowerCase(),
        senha: hashSenha,
        oc: 0,
        _id: new mongodb_1.ObjectId()
    };
    // Verificando a existência
    const existe = yield UsersCollection.findOne({ username: novoUser.username });
    if (existe) {
        res.json({
            mensagem: `Existe um usuário cadastrado com o username ${novoUser.username}`,
            tipo: 'erro',
            campo: 'username'
        });
        return;
    }
    // Gerando token de autenticação
    const expiresToken = new Date(Date.now() + (1000 * 60 * 60 * 24 * 5));
    const token = (0, jsonwebtoken_1.sign)({ username }, process.env.SECRET_TOKEN, { expiresIn: Math.floor((expiresToken.getTime() - Date.now()) / 1000) });
    const novoToken = {
        expires: expiresToken,
        to: novoUser._id,
        token,
        type: "auth",
        _id: new mongodb_1.ObjectId()
    };
    // Salvando dados no banco de dado
    yield TokensCollection.insertOne(novoToken);
    yield UsersCollection.insertOne(novoUser);
    req.session.user = {
        _id: novoUser._id,
        lastAccess: new Date(),
        token: token,
        username: novoUser.username
    };
    res.json({
        tipo: 'sucesso',
        mensagem: 'Conta criada com sucesso!',
        dados: Object.assign(Object.assign({}, novoUser), { token })
    });
}));
// ============= [ Configurando rota ]
auth.use('/api', api); // /auth/
exports.default = auth;
