# Dockerfile para Strapi con compilación de dependencias nativas

FROM node:18-alpine

# 1) Instala vips (sharp), sqlite (better-sqlite3) y herramientas de compilación
RUN apk add --no-cache \
    vips-dev vips-tools \
    sqlite-dev \
    build-base \
    python3

WORKDIR /opt/app

# 2) Copia todo el proyecto
COPY . .

# 3) Activa Corepack (Yarn 4.x)
RUN corepack enable

# 4) Instala dependencias (ahora las nativas pueden compilarse)
RUN yarn install

# 5) Compila Strapi
RUN yarn build

# 6) Expone el puerto y arranca
EXPOSE 1337
CMD ["yarn", "start"]
