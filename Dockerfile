FROM node:18-alpine


COPY . ./app

WORKDIR /app

RUN npm i -g typescript pnpm
RUN pnpm install

RUN tsc


CMD npm run start
