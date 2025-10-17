FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN apt-get update && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

CMD ["node", "index.js"]