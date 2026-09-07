FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./

RUN bun install --production

COPY server.ts .

EXPOSE 5000

CMD ["bun", "server.ts"]