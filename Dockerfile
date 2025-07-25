# Dockerfile para Strapi (sin yarn.lock y sin --immutable)

FROM node:18-alpine

# Dependencias nativas para procesamiento de imágenes (sharp)
RUN apk add --no-cache vips-dev

# Establece el directorio de trabajo
WORKDIR /opt/app

# Copia todo el código de la aplicación
COPY . .

# Activa Corepack para gestionar Yarn
RUN corepack enable

# Instala dependencias y genera yarn.lock dentro del contenedor
RUN yarn install

# Compila la aplicación Strapi
RUN yarn build

# Expone el puerto por defecto de Strapi
EXPOSE 1337

# Comando por defecto para iniciar el servidor
CMD ["yarn", "start"]
