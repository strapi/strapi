#!/bin/bash
echo ">  Uninstalling Strapi dev modules..."
echo ""
npm uninstall -g strapi-admin
npm uninstall -g strapi-email-sendmail
npm uninstall -g strapi-generate
npm uninstall -g strapi-generate-admin
npm uninstall -g strapi-generate-api
npm uninstall -g strapi-generate-new
npm uninstall -g strapi-helper-plugin
npm uninstall -g strapi-hook-bookshelf
npm uninstall -g strapi-hook-knex
npm uninstall -g strapi-hook-mongoose
npm uninstall -g strapi-lint
npm uninstall -g strapi-plugin-content-manager
npm uninstall -g strapi-plugin-content-type-builder
npm uninstall -g strapi-plugin-email
npm uninstall -g strapi-plugin-graphql
npm uninstall -g strapi-plugin-settings-manager
npm uninstall -g strapi-plugin-upload
npm uninstall -g strapi-plugin-users-permissions
npm uninstall -g strapi-upload-local
npm uninstall -g strapi-utils
echo ""
echo ">  Please check below to see if any Strapi dev modules are still installed. If there are, uninstall them manually."
echo ""
npm list -g --depth=0