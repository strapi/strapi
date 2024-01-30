import { Common, Shared } from '../types';
import type * as Types from './entity-service';

type Entity = {
  id: ID;
  [key: string]: unknown;
} | null;

type ID = { id: string | number };

type Options = { isDraft?: boolean; locale?: string };

export interface EntityValidator {
  validateEntityCreation: <TUID extends Common.UID.ContentType>(
    model: Shared.ContentTypes[TUID],
    data: Types.Params.Data.Input<TUID>,
    options?: Options
  ) => Promise<Types.Params.Data.Input<TUID>>;
  validateEntityUpdate: <TUID extends Common.UID.ContentType>(
    model: Shared.ContentTypes[TUID],
    data: Partial<Types.Params.Data.Input<TUID>> | undefined,
    options?: Options,
    entity?: Entity
  ) => Promise<Types.Params.Data.Input<TUID>>;
}
