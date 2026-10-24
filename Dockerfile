FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts
FROM node:24-bookworm-slim
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json ./
COPY docker-entrypoint.sh /usr/local/bin/fm-journal-entrypoint
RUN mkdir /data && chown node:node /data
RUN chmod 755 /usr/local/bin/fm-journal-entrypoint
ENTRYPOINT ["fm-journal-entrypoint"]
EXPOSE 3000
CMD ["node","server/index.mjs"]
