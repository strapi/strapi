# cloned from https://github.com/kriasoft/nodejs-api-starter/blob/master/Dockerfile
FROM node:11.1.0-alpine

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

# Set a working directory
WORKDIR /usr/src/app

# Install native dependencies
# RUN set -ex; \
#   apk add --no-cache ...

# Install Node.js dependencies
COPY package.json yarn.lock ./
COPY admin ./admin
COPY plugins ./plugins

RUN set -ex; \
    if [ "$NODE_ENV" = "production" ]; then \
    yarn install --no-cache --frozen-lockfile --production; \
    elif [ "$NODE_ENV" = "test" ]; then \
    touch yarn-error.log; \
    mkdir -m 777 build; \
    yarn install --no-cache --frozen-lockfile; \
    chown -R node:node build node_modules package.json yarn.lock yarn-error.log; \
    else \
    touch yarn-error.log; \
    mkdir -p -m 777 build node_modules /home/node/.cache/yarn; \
    chown -R node:node build node_modules package.json yarn.lock yarn-error.log /home/node/.cache/yarn; \
    fi;

# Bundle app source
COPY . .

EXPOSE 1337
CMD [ "npm", "start" ]
