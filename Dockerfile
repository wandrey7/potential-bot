FROM node:22

WORKDIR /app

COPY . .

RUN npm install

RUN apt-get update && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

CMD ["node", "index.js"]