FROM node:22-slim AS builder

# Install build dependencies for canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

RUN npm prune --production

FROM node:22-slim AS production

# Install runtime dependencies for canvas
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    libexpat1 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app .

CMD ["node", "index.js"]