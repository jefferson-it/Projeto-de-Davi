# Proposta do Trabalho do Professor

1. Levantamento e análise de requisitos + modelagem UML.

- Mosá Costa e José Felipe

---

2. Design e usabilidade (wireframes, responsividade, acessibilidade).

- Daniel Basto

---

3. Desenvolvimento da arquitetura back-end (API, banco de dados).

- Jefferson Silva de Souza

---

4. Desenvolvimento front-end (interface e integração com API).

- Otávio Neto

---

5. Segurança e disponibilidade (login, backups, erros).

---

6. Testes e validação (testes de unidade e integração).

- Todos

## Integrantes do Grupo

1. Jefferson Silva
2. ⁠José Felipe
3. ⁠Otavio Neto
4. ⁠Irlan Lima
5. ⁠Daniel Basto
6. ⁠Mosá de Costa
7. ⁠Marcos Brener
8. Railan Santos

# Nossa Proposta

O nosso projeto é um simples gestor de produtos, cadastrando os produtos no sistema.

As rotas base da aplicação são

- /auth
- - Autenticação

- /categorias
- - Autenticação

- /produtos
- - Autenticação

As rotas `produtos` e `categorias` tem as seguintes rotas idênticas, dentro do filho `/api`.

| Rota    | Desc.                  | Método |
| ------- | ---------------------- | ------ |
| /lista  | Obtém a lista de dados | GET    |
| /obter  | Obtém um dado pelo ID  | GET    |
| /criar  | Cria um novo dado      | POST   |
| /editar | Editar o Dado          | POST   |

# API de Produtos

## 🔹 `GET /produtos/api/lista`

**Query Params:**

- `limite` (opcional, `int`): número máximo de produtos a retornar.
- `pular` (opcional, `int`): número de produtos a ignorar (para paginação).

---

## 🔹 `GET /produtos/api/obter`

**Query Params:**

- `id` (`string`): ID do produto a ser obtido.

---

## 🔹 `POST /produtos/api/criar`

**Body JSON:**

```json
{
  "nome": "string",
  "categoria": "string",
  "desc": "string (mínimo 10 caracteres)",
  "preco": "string ou float"
}
```

---

## 🔹 `POST /produtos/api/editar`

**Body JSON:**

```json
{
  "urlId": "string",
  "nome": "string",
  "categoria": "string",
  "desc": "string (mínimo 10 caracteres)",
  "preco": "string ou float"
}
```

---

# API de Categorias

## 🔹 `GET /categorias/api/lista`

**Query Params:**

- `limite` (opcional, `int`): número máximo de categorias a retornar.
- `pular` (opcional, `int`): número de categorias a ignorar (para paginação).

---

## 🔹 `GET /categorias/api/obter`

**Query Params:**

- `id` (`string`): ID da categoria a ser obtida.

---

## 🔹 `POST /categorias/api/criar`

**Body JSON:**

```json
{
  "nome": "string"
}
```

---

## 🔹 `POST /categorias/api/editar`

**Body JSON:**

```json
{
  "urlId": "string",
  "nome": "string"
}
```

# Api de Autenticação

## 🔹 `GET /auth/api/get-state`

Esta api não precisa de query, ela serve para retornar os dados de um usuário logado.

## 🔹 `GET /auth/api/login`

```json
{
  "senha": "string",
  "username": "string"
}
```

## 🔹 `GET /auth/api/registrar`

```json
{
  "senha": "string",
  "confirmar_senha": "string",
  "username": "string",
  "termos": "string ou boolean"
}
```
