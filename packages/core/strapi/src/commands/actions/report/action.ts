import { EOL } from 'os';
import strapi from '../../../Strapi';

interface CmdOptions {
  uuid: boolean;
  dependencies: boolean;
  all: boolean;
}

export default async ({ uuid, dependencies, all }: CmdOptions) => {
  const config = {
    reportUUID: Boolean(all || uuid),
    reportDependencies: Boolean(all || dependencies),
  };

  const appContext = await strapi.compile();
  const app = await strapi(appContext).register();

  let debugInfo = `Launched In: ${Date.now() - app.config.launchedAt} ms
Environment: ${app.config.environment}
OS: ${process.platform}-${process.arch}
Strapi Version: ${app.config.info.strapi}
Node/Yarn Version: ${process.env.npm_config_user_agent}
Edition: ${app.EE ? 'Enterprise' : 'Community'}
Database: ${app?.config?.database?.connection?.client ?? 'unknown'}`;

  if (config.reportUUID) {
    debugInfo += `${EOL}UUID: ${app.config.uuid}`;
  }

  if (config.reportDependencies) {
    debugInfo += `${EOL}Dependencies: ${JSON.stringify(app.config.info.dependencies, null, 2)}
Dev Dependencies: ${JSON.stringify(app.config.info.devDependencies, null, 2)}`;
  }

  console.log(debugInfo);

  await app.destroy();
};
