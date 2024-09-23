import type { ContentTypes } from '../schema';
import type * as UID from '../uid';

import type * as EntityService from './entity-service';

export type Entity = {
  id: number;
  [key: string]: unknown;
} | null;

type Options = { isDraft?: boolean; locale?: string };

export interface EntityValidator {
  validateEntityCreation: <TUID extends UID.ContentType>(
    model: ContentTypes[TUID],
    data: EntityService.Params.Data.Input<TUID>,
    options?: Options
  ) => Promise<EntityService.Params.Data.Input<TUID>>;
  validateEntityUpdate: <TUID extends UID.ContentType>(
    model: ContentTypes[TUID],
    data: Partial<EntityService.Params.Data.Input<TUID>> | undefined,
    options?: Options,
    entity?: Entity
  ) => Promise<EntityService.Params.Data.Input<TUID>>;
}
