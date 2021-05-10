// TODO temp file
import documentationPlugin from '../../../../plugins/documentation/admin/src';
import graphqlPlugin from '../../../../plugins/graphql/admin/src';
import usersPermissionsPlugin from '../../../../plugins/users-permissions/admin/src';

const plugins = {
  '@strapi/plugin-documentation': documentationPlugin,
  '@strapi/plugin-graphql': graphqlPlugin,
  '@strapi/plugin-users-permissions': usersPermissionsPlugin,
};

export default plugins;
