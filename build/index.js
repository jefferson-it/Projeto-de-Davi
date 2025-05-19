"use strict";
/*
    Projeto: Definir nome
    Desenvolvedor:
        1. Jefferson Silva De Souza (Back-end)
        2. Otávio Neto (Front-End)

    Projeto desenvolvido para a atividade dirigida do professor Davi,
    materia Engenharia de Software II.

    Outros Integrantes do trabalho:
        1. Danial Bastos
        2. Irlan Lima
        3. Railan Santos
        4. José Felipe
        5. Marcos Brener
        6. Mosá Costa


    Este projeto serve para cadastrar produtos, de forma simples

    Ferramentas usadas:
    1. NodeJS
        -   engine para odar o projeto / backend
    2. HTML/CSS e JS
        - páginas web / frontend
    3. Express
        - biblioteca para criar servidores e gerir rotas / api
    4 - Body Parser
        - Converte os dados de formulário para JSON
    5 - BcryptJS
        - Serve para proteger senhas, criando hash
    6 - Express-Session
        - Auxiliar na gestão de sessões
    7 - mongodb
        - Banco de Dados
    8 - TypeScript
        - SuperSet do JS que ajuda na organização e tipagem dos dados / backend
    9 - dotenv
        - Carrega as variáveis de ambientes(no arquivo .env)
    10 - session-file-store
        - Salvar sessões em arquivos evitando perca de dados
    11 - JSON Web Token
        - Cria Tokens para autenticação de usuários
    12 - Cors
        - Serve para configurar o controle do site para consumo de api em aplicações externas
*/
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// ============= [ Importações ]
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_session_1 = __importDefault(require("express-session"));
const session_file_store_1 = __importDefault(require("session-file-store"));
const auth_1 = __importStar(require("./router/auth"));
const cors_1 = __importDefault(require("cors"));
const categorias_1 = __importDefault(require("./router/categorias"));
const produtos_1 = __importDefault(require("./router/produtos"));
const utils_1 = require("./utils");
// ============= [ Constantes ]
const app = (0, express_1.default)(); // Servidor
const FileStore = (0, session_file_store_1.default)(express_session_1.default); // Gerenciador de Sessão em arquivos
// ============= [ Configurações ]
app.use(express_1.default.static(`./public`)); // Configurando pasta estática  
/**
 * Aqui eu configuro o cors(Cross-Origin Resource Sharing)
 *
 * Referencia do que é: https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/CORS
 *
 * O endereço http://localhost:5500 é o único autorizado a consumir as APIs desta aplicação
 * O Credentials permite que sessões, cookies sejam compartilhados em requisições com o fetch
 *  e outros meios de consumir api
 */
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true
}));
// Configurando o body-parser para poder converter os dados vindo do formulário em JSON
app.use(body_parser_1.default.urlencoded({ extended: true, limit: "500gb" }));
app.use(body_parser_1.default.json({ limit: "500gb" }));
/**
 * Configurando a sessões com express-session
 * O Secret é uma chave secreta para sessão,
 * o store é onde a sessão é salva caso o servidor desligue, reinicie ou dê pau
*/
app.use((0, express_session_1.default)({
    secret: 'hello-brothers',
    store: new FileStore({
        path: './sessions',
        retries: 1,
        ttl: 3600
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 15, // 15 Dias
        secure: false, // true somente se for HTTPS
        sameSite: 'lax',
        httpOnly: true
    }
}));
// ============= [  Configurando as rotas ]
app.use("/auth", auth_1.default); // Rota de autenticação
app.use("/categorias", categorias_1.default); // rota de categorias
app.use("/produtos", produtos_1.default); // rota de produtos
app.get("/", (_, res) => {
    res.send((0, utils_1.getPage)('index'));
});
app.get("/login", auth_1.userNotLogged, (_, res) => {
    res.send((0, utils_1.getPage)('login'));
});
app.get("/signup", auth_1.userNotLogged, (_, res) => {
    res.send((0, utils_1.getPage)('signup'));
});
// Rodando o servidor
app.listen(process.env.PORT || 3010, () => {
    console.log(`http://localhost:${process.env.PORT || 3010}`);
});
