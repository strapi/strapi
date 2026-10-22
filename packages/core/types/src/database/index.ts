import type { Internal } from '@strapi/database';

import type * as UID from '../uid';
import type { Repository } from './repository';

export type * as Params from './params';
export type * as Result from './result';
export type { Repository } from './repository';

// TODO: The interfaces below narrow `@strapi/database`'s types until they are moved to `@strapi/types`.

export interface Model extends Internal.Model {
  uid: UID.Schema;
}

export interface Database extends Internal.Database {
  query<TSchemaUID extends UID.Schema>(uid: TSchemaUID): Repository<TSchemaUID>;
}
