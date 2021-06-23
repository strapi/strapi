// TODO temp file
import documentationPlugin from '../../../../plugins/documentation/admin/src';
import graphqlPlugin from '../../../../plugins/graphql/admin/src';
import i18nPlugin from '../../../../plugins/i18n/admin/src';
import sentryPlugin from '../../../../plugins/sentry/admin/src';
import usersPermissionsPlugin from '../../../../plugins/users-permissions/admin/src';
import ctbPlugin from '../../../content-type-builder/admin/src';
import emailPlugin from '../../../email/admin/src';
import uploadPlugin from '../../../upload/admin/src';

const plugins = {
  '@strapi/plugin-content-type-builder': ctbPlugin,
  '@strapi/plugin-documentation': documentationPlugin,
  '@strapi/plugin-i18n': i18nPlugin,
  '@strapi/plugin-email': emailPlugin,
  '@strapi/plugin-upload': uploadPlugin,
  '@strapi/plugin-graphql': graphqlPlugin,
  '@strapi/plugin-sentry': sentryPlugin,
  '@strapi/plugin-users-permissions': usersPermissionsPlugin,
};

export default plugins;
