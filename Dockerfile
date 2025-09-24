# ==============================================================#
# Dockerfile Strapi (fork oficial) - Solución para lockfile desactualizado
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

# 3) Copia TODO el proyecto completo (monorepo requiere contexto completo)
COPY . .

# 4) Activa Yarn 4.5.0 y configura para CI
RUN corepack enable && corepack prepare yarn@4.5.0 --activate

# 5) Instala dependencias sin modo inmutable (permite actualizar lockfile)
RUN yarn install

# 6) Construye la aplicación
RUN yarn build

# 7) Configuración para la aplicación de ejemplo
WORKDIR /opt/app/examples/getstarted

# 7.1) Instalar driver de PostgreSQL
RUN yarn add pg

# 8) Variables de entorno por defecto para Strapi
ENV NODE_ENV=development
ENV JWT_SECRET=defaultJwtSecret123456789
ENV APP_KEYS=defaultAppKey1,defaultAppKey2,defaultAppKey3,defaultAppKey4
ENV API_TOKEN_SALT=defaultApiTokenSalt123
ENV ADMIN_JWT_SECRET=defaultAdminJwtSecret123
ENV TRANSFER_TOKEN_SALT=defaultTransferTokenSalt123
ENV HOST=0.0.0.0
ENV PORT=1337
ENV DB=postgres
ENV DATABASE_CLIENT=postgres

EXPOSE 1337

# Inicia la aplicación Strapi de ejemplo en modo desarrollo
# Rebuild admin panel con nuevas variables de entorno
CMD ["sh", "-c", "yarn build && yarn develop"]
# ==============================================================#
