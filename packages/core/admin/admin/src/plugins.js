// TODO temp file
import documentationPlugin from '../../../../plugins/documentation/admin/src';
import graphqlPlugin from '../../../../plugins/graphql/admin/src';
import sentryPlugin from '../../../../plugins/sentry/admin/src';
import usersPermissionsPlugin from '../../../../plugins/users-permissions/admin/src';
import cmPlugin from '../../../content-manager/admin/src';
import ctbPlugin from '../../../content-type-builder/admin/src';
import emailPlugin from '../../../email/admin/src';

const plugins = {
  '@strapi/plugin-content-manager': cmPlugin,
  '@strapi/plugin-content-type-builder': ctbPlugin,
  '@strapi/plugin-documentation': documentationPlugin,
  '@strapi/plugin-email': emailPlugin,
  '@strapi/plugin-graphql': graphqlPlugin,
  '@strapi/plugin-sentry': sentryPlugin,
  '@strapi/plugin-users-permissions': usersPermissionsPlugin,
};

export default plugins;
