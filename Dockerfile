# ==============================================================#
# Dockerfile Strapi (fork oficial) con Workspaces y peerDeps opcionales
# ==============================================================#
FROM node:18-bullseye-slim

# 1) Dependencias del sistema para compilar nativos (sharp, sqlite…)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential \
      python3 \
      python3-dev \
      libvips-dev \
 && rm -rf /var/lib/apt/lists/*

# 2) Directorio de trabajo
WORKDIR /opt/app

# 3) Copia manifiestos y config de Yarn
COPY package.json yarn.lock .yarnrc.yml .yarn/releases/ ./

# 4) Copia todo el engine de Yarn Berry
COPY .yarn/ ./.yarn/

# 5) Copia los workspaces de Strapi para que Yarn los resuelva
COPY packages/ packages/

# 6) Ajuste para ignorar peerDependencies faltantes
RUN printf "\npackageExtensions:\n" >> .yarnrc.yml \
 && printf "  \"@strapi/*@*\":\n" >> .yarnrc.yml \
 && printf "    peerDependenciesMeta:\n" >> .yarnrc.yml \
 && printf "      esbuild:\n" >> .yarnrc.yml \
 && printf "        optional: true\n" >> .yarnrc.yml \
 && printf "      tslib:\n" >> .yarnrc.yml \
 && printf "        optional: true\n" >> .yarnrc.yml \
 && printf "      jest:\n" >> .yarnrc.yml \
 && printf "        optional: true\n" >> .yarnrc.yml

# 7) Activa la versión correcta de Yarn y ejecuta instalación inmutable
RUN corepack prepare yarn@4.5.0 --activate \
 && yarn install --immutable

# 8) Copia el resto del código y compila
COPY . .
RUN yarn build

# 9) Modo producción y arranque
ENV NODE_ENV=production
EXPOSE 1337
CMD ["yarn", "start"]
# ==============================================================#
