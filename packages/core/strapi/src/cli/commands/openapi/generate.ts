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

const action = async (options: CommandOptions) => {
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
  fse.writeFileSync(filePath, JSON.stringify(document, null, 2));
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
