# =============================================================
# Dockerfile para Strapi (fork oficial) con Workspaces
# =============================================================
FROM node:18-bullseye-slim

# 1) Instala dependencias del sistema para módulos nativos
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      python3 \
      python3-dev \
      libvips-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app

# 2) Copia únicamente los manifiestos y configuración de Yarn
COPY package.json yarn.lock .yarnrc.yml .yarn/releases/ ./

# 3) Copia la carpeta interna de Yarn
COPY .yarn/ ./.yarn/

# 4) COPIA los directorios de tus workspaces para resolverlos
COPY packages/ packages/

# 5) Activa la versión correcta de Yarn y ejecuta instalación inmutable
RUN corepack prepare yarn@4.5.0 --activate \
 && yarn install --immutable

# 6) Copia el resto de tu código (por si hay archivos fuera de packages)
COPY . .

# 7) Compila Strapi
RUN yarn build

# 8) Modo producción y lanzamiento
ENV NODE_ENV=production
EXPOSE 1337
CMD ["yarn", "start"]
# =============================================================
