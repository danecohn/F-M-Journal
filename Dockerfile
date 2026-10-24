FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && npm prune --omit=dev --ignore-scripts
FROM node:24-bookworm-slim
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json ./
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node","server/index.mjs"]
