# The MedBook frontend (Angular + its Node server) as a container image. Used by
# deploy/docker-compose.yml; the API is a separate image (../MedBook.Api/Dockerfile).

# --- build ---
FROM node:22-alpine AS build
WORKDIR /app

# Install first, from the lock file only, so this layer is cached until a dependency changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- run ---
# The production build bundles the server and its dependencies, so only dist/ is needed.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000
COPY --from=build /app/dist ./dist
USER node
EXPOSE 4000

CMD ["node", "dist/MedBook/server/server.mjs"]
