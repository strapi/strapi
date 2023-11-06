import { Common, Shared } from '../types';
import type * as Types from './entity-service';

type Entity = {
  id: ID;
  [key: string]: unknown;
} | null;

type ID = { id: string | number };

export interface EntityValidator {
  validateEntityCreation: <TUID extends Common.UID.ContentType>(
    model: Shared.ContentTypes[TUID],
    data: Types.Params.Data.Input<TUID>,
    options?: { isDraft?: boolean }
  ) => Promise<Types.Params.Data.Input<TUID>>;
  validateEntityUpdate: <TUID extends Common.UID.ContentType>(
    model: Shared.ContentTypes[TUID],
    data: Partial<Types.Params.Data.Input<TUID>> | undefined,
    options?: { isDraft?: boolean },
    entity?: Entity
  ) => Promise<Types.Params.Data.Input<TUID>>;
}
