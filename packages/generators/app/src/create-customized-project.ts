import inquirer from 'inquirer';
import { merge } from 'lodash';

import { trackUsage } from './utils/usage';
import defaultConfigs from './utils/db-configs';
import clientDependencies from './utils/db-client-dependencies';
import dbQuestions from './utils/db-questions';
import createProject from './create-project';
import type { Configuration, Scope } from './types';

const LANGUAGES = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
};

export default async (scope: Scope) => {
  if (!scope.useTypescript) {
    const language = await askAboutLanguages();
    scope.useTypescript = language === LANGUAGES.typescript;
  }

  await trackUsage({ event: 'didChooseCustomDatabase', scope });

  const configuration = await askDbInfosAndTest(scope).catch((error) => {
    return trackUsage({ event: 'didNotConnectDatabase', scope, error }).then(() => {
      throw error;
    });
  });

  console.log();
  console.log('Creating a project with custom database options.');
  await trackUsage({ event: 'didConnectDatabase', scope });
  return createProject(scope, configuration);
};

async function askDbInfosAndTest(scope: Scope) {
  const { client, connection } = await askDatabaseInfos(scope);

  return {
    client,
    connection,
    dependencies: clientDependencies({ client }),
  } as Configuration;
}

async function askDatabaseInfos(scope: Scope) {
  const { client } = await inquirer.prompt<{ client: 'sqlite' | 'postgres' | 'mysql' }>([
    {
      type: 'list',
      name: 'client',
      message: 'Choose your default database client',
      choices: ['sqlite', 'postgres', 'mysql'],
      default: 'sqlite',
    },
  ]);

  const questions = dbQuestions[client].map((q) => q({ scope, client }));

  if (!questions) {
    return { client };
  }

  const responses = await inquirer.prompt(questions);

  const connection = merge({}, defaultConfigs[client] || {}, {
    client,
    connection: responses,
  });

  return {
    client,
    connection,
  };
}

async function askAboutLanguages() {
  const { language } = await inquirer.prompt([
    {
      type: 'list',
      name: 'language',
      message: 'Choose your preferred language',
      choices: Object.values(LANGUAGES),
      default: LANGUAGES.javascript,
    },
  ]);

  return language;
}
