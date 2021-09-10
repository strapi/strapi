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
  'content-type-builder': ctbPlugin,
  documentation: documentationPlugin,
  i18n: i18nPlugin,
  email: emailPlugin,
  upload: uploadPlugin,
  graphql: graphqlPlugin,
  sentry: sentryPlugin,
  'users-permissions': usersPermissionsPlugin,
};

export default plugins;
