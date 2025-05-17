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

// ============= [ Importações ]
import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import FileStoreConstructor from 'session-file-store';
import auth from "./router/auth";
import cors from "cors";
import categories from "./router/categorias";
import products from "./router/produtos";

// ============= [ Constantes ]
const app = express(); // Servidor
const FileStore = FileStoreConstructor(session); // Gerenciador de Sessão em arquivos


// ============= [ Configurações ]


app.use(express.static(`${__dirname}/public`)); // Configurando pasta estática

/**
 * Aqui eu configuro o cors(Cross-Origin Resource Sharing)
 * 
 * Referencia do que é: https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/CORS
 * 
 * O endereço http://localhost:5500 é o único autorizado a consumir as APIs desta aplicação
 * O Credentials permite que sessões, cookies sejam compartilhados em requisições com o fetch 
 *  e outros meios de consumir api 
 */
app.use(cors({
    origin: 'http://localhost:5500',
    credentials: true
}));

// Configurando o body-parser para poder converter os dados vindo do formulário em JSON
app.use(bodyParser.urlencoded({ extended: true, limit: 500 }));
app.use(bodyParser.json({ limit: 500 }))

/**
 * Configurando a sessões com express-session 
 * O Secret é uma chave secreta para sessão, 
 * o store é onde a sessão é salva caso o servidor desligue, reinicie ou dê pau
*/
app.use(session({
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
}))

// ============= [  Configurando as rotas ]
app.use("/auth", auth); // Rota de autenticação
app.use("/categorias", categories); // rota de categorias
app.use("/produtos", products); // rota de produtos

// Rodando o servidor
app.listen(process.env.PORT || 3010, () => {
    console.log(`http://localhost:${process.env.PORT || 3010}`);
})