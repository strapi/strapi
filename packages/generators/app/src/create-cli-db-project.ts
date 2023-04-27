import { merge } from 'lodash';

import { trackUsage } from './utils/usage';
import defaultConfigs from './utils/db-configs';
import clientDependencies from './utils/db-client-dependencies';
import getClientName from './utils/db-client-name';
import createProject from './create-project';

import type { ClientName, Configuration, Scope } from './types';

export default async (scope: Scope) => {
  console.log('Creating a project from the database CLI arguments.');
  await trackUsage({ event: 'didChooseCustomDatabase', scope });

  const { client } = scope.database ?? {};

  if (!client) {
    throw new Error('Missing client');
  }

  const configuration: Configuration = {
    client: getClientName({ client }),
    connection: merge(
      {},
      defaultConfigs[client as keyof typeof defaultConfigs] || {},
      scope.database
    ),
    dependencies: clientDependencies({ scope, client } as { scope: Scope; client: ClientName }),
  };

  return createProject(scope, configuration);
};
