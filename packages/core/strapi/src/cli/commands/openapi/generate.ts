import { compileStrapi, createStrapi } from '@strapi/core';
import * as openapi from '@strapi/openapi';

import type { Core } from '@strapi/types';

import chalk from 'chalk';
import fse from 'fs-extra';
import path from 'path';

const DEFAULT_OUTPUT = path.join(process.cwd(), 'specification.json');

interface CommandOptions {
  output?: string;
}

interface StrapiInfoConfig {
  name: string;
  version: string;
}

const EXPERIMENTAL_MSG = chalk.yellow(`
⚠️  The OpenAPI generation feature is currently experimental.
    Its behavior and output might change in future releases without following semver.
    Please report any issues you encounter on https://github.com/strapi/strapi/issues/new?template=BUG_REPORT.yml.
`);

/**
 * @experimental
 */
const action = async (options: CommandOptions) => {
  console.warn(EXPERIMENTAL_MSG);

  const filePath = options.output ?? DEFAULT_OUTPUT;
  const app = await createStrapiApp();

  const { document, durationMs } = openapi.generate(app, { type: 'content-api' });

  writeDocumentToFile(document, filePath);
  summarize(app, durationMs, filePath);

  await teardownStrapiApp(app);
};

const createStrapiApp = async (): Promise<Core.Strapi> => {
  const appContext = await compileStrapi();
  const app = createStrapi(appContext);

  // Make sure to not log Strapi debug info
  app.log.level = 'error';

  // Load internals
  await app.load();

  // Make sure the routes are mounted before generating the specification
  app.server.mount();

  return app;
};

const writeDocumentToFile = (document: unknown, filePath: string): void => {
  fse.outputFileSync(filePath, JSON.stringify(document, null, 2));
};

const teardownStrapiApp = async (app: Core.Strapi) => {
  await app.destroy();
};

const summarize = (app: Core.Strapi, durationMs: number, filePath: string): void => {
  const cwd = process.cwd();
  const relativeFilePath = path.relative(cwd, filePath);
  const { name, version } = app.config.get<StrapiInfoConfig>('info');

  const fName = chalk.cyan(name);
  const fVersion = chalk.cyan(`v${version}`);
  const fFile = chalk.magenta(relativeFilePath);
  const fTime = chalk.green(`${durationMs}ms`);

  console.log(
    chalk.bold(
      `Generated an OpenAPI specification for "${fName} ${fVersion}" at ${fFile} in ${fTime}`
    )
  );
};

export { action };
