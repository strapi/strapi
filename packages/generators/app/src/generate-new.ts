import { trackUsage } from './utils/usage';
import checkInstallPath from './utils/check-install-path';
import createCLIDatabaseProject from './create-cli-db-project';
import createCustomizedProject from './create-customized-project';
import createQuickStartProject from './create-quickstart-project';

import type { Scope } from './types';

export default async (scope: Scope) => {
  const hasDatabaseConfig = Boolean(scope.database);

  // check rootPath is empty
  checkInstallPath(scope.rootPath);

  await trackUsage({ event: 'willCreateProject', scope });

  // if database config is provided don't test the connection and create the project directly
  if (hasDatabaseConfig) {
    return createCLIDatabaseProject(scope);
  }

  // if cli quickstart create project with default sqlite options
  if (scope.quick === true) {
    return createQuickStartProject(scope);
  }
  // create a project with full list of questions
  return createCustomizedProject(scope);
};
