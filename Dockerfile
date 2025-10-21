FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm prune --production

FROM node:22-slim AS production

WORKDIR /app

COPY --from=builder /app .

CMD ["node", "index.js"]