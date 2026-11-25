import type { Core } from '@strapi/types';

import type { LateRegistration } from '../utils/late-registration';

/**
 * The Strapi apps whose database models are built: `bootstrap()` read the content types,
 * components and extra models, and passed them to `db.init()`. From then on, a model or a schema
 * change no longer reaches the database.
 *
 * `strapi.isLoaded` cannot tell: it stays `false` through the whole bootstrap phase, while the
 * database models are built at its start.
 */
const appsWithBuiltDatabaseModels = new WeakSet<Core.Strapi>();

export const markDatabaseModelsBuilt = (strapi: Core.Strapi): void => {
  appsWithBuiltDatabaseModels.add(strapi);
};

export const areDatabaseModelsBuilt = (strapi: Core.Strapi): boolean =>
  appsWithBuiltDatabaseModels.has(strapi);

/** The fields shared by the warnings of the models and content types registries. */
export const databaseModelsWindow: Pick<LateRegistration, 'closedBy' | 'registerIn'> = {
  closedBy: 'Strapi built the database models at the start of the bootstrap phase',
  registerIn: 'from a register function',
};
