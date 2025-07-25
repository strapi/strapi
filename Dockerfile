# =============================================================
# Dockerfile para Strapi (usando el lockfile y configuración oficial)
# =============================================================
FROM node:18-bullseye-slim

# 1) Dependencias del sistema para módulos nativos (sharp, sqlite, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3 \
    python3-dev \
    libvips-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# 2) Copia sólo los manifiestos de dependencias para cachear:
COPY package.json yarn.lock .yarnrc.yml .yarn/releases/ ./

# 3) Copia la configuración completa de Yarn Berry:
COPY .yarn/ ./.yarn/

# 4) Activa la versión correcta de Yarn y instala en modo inmutable:
RUN corepack prepare yarn@4.5.0 --activate \
 && yarn install --immutable

# 5) Copia el resto de tu código y compila:
COPY . .
RUN yarn build

# 6) Modo producción y lanzamiento
ENV NODE_ENV=production
EXPOSE 1337
CMD ["yarn", "start"]
