// // TODO temp file
import documentationPlugin from '../../../../plugins/documentation/admin/src';
// import graphqlPlugin from '../../../../plugins/graphql/admin/src';
// import sentryPlugin from '../../../../plugins/sentry/admin/src';
import i18nPlugin from '../../../../plugins/i18n/strapi-admin';
import usersPermissionsPlugin from '../../../../plugins/users-permissions/strapi-admin';
import ctbPlugin from '../../../content-type-builder/strapi-admin';
import emailPlugin from '../../../email/strapi-admin';
import uploadPlugin from '../../../upload/strapi-admin';

const plugins = {
  '@strapi/plugin-content-type-builder': ctbPlugin,
  '@strapi/plugin-i18n': i18nPlugin,
  '@strapi/plugin-email': emailPlugin,
  '@strapi/plugin-upload': uploadPlugin,
  '@strapi/plugin-users-permissions': usersPermissionsPlugin,
  '@strapi/plugin-documentation': documentationPlugin,
  // '@strapi/plugin-graphql': graphqlPlugin,
  // '@strapi/plugin-sentry': sentryPlugin,
};

export default plugins;
