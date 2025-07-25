FROM node:18-alpine

# libvips para sharp
RUN apk add --no-cache vips-dev

WORKDIR /opt/app

# 1) Copia sólo los archivos de gestión de paquetes
COPY package.json yarn.lock ./

# 2) Fija exactamente la versión de Yarn que genera tu lockfile
RUN corepack prepare yarn@3.5.2 --activate

# 3) Ya puedes instalar de forma inmutable
RUN yarn install --immutable

# 4) Copia el resto del código y construye
COPY . .
RUN yarn build

EXPOSE 1337
CMD ["yarn", "start"]
