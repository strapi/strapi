#!/bin/sh
set -e

cd packages/strapi-utils
npm link
cd ../strapi-mongoose
npm link strapi-utils
npm link
cd ../strapi-bookshelf
npm link strapi-utils
npm link
cd ../strapi-generate-migrations
npm link strapi-bookshelf
npm link strapi-utils
npm link
cd ../strapi-generate
npm link strapi-utils
npm link
cd ../strapi-generate-admin
npm link strapi-utils
npm link
cd files/admin/public
npm install
npm run build
cd ../../../
cd ../strapi-generate-api
npm link
cd ../strapi-generate-policy
npm link
cd ../strapi-generate-service
npm link
cd ../strapi-generate-new
npm link strapi-utils
npm link
cd ../strapi
npm link strapi-generate-new
npm link strapi-generate
npm link strapi-generate-admin
npm link strapi-generate-api
npm link strapi-generate-policy
npm link strapi-generate-service
npm link strapi-generate-migrations
npm link strapi-mongoose
npm link strapi-utils
npm install
npm link
cd ./node_modules/koa-joi-router
sed -i.bu 's/await-busboy/co-busboy/' joi-router.js
npm install co-busboy
cd ..
cd ..
cd ..
cd ..
npm install
