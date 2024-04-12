import type { UID, Schema } from '../..';
import type * as EntityService from '../entity-service';
import type * as AttributeUtils from './params/attributes';

// TODO: move to common place
type ComponentBody = {
  [key: string]: AttributeUtils.GetValue<
    | Schema.Attribute.Component<UID.Component, false>
    | Schema.Attribute.Component<UID.Component, true>
    | Schema.Attribute.DynamicZone
  >;
};

export type ComponentExtension = {
  /**
   * @internal
   * Exposed for use within document service middlewares
   */
  updateComponents: (
    entityToUpdate: {
      id: EntityService.Params.Attribute.ID;
    },
    data: EntityService.Params.Data.Input<UID.Schema>
  ) => Promise<ComponentBody>;

  /**
   * @internal
   * Exposed for use within document service middlewares
   */
  omitComponentData: (
    data: EntityService.Params.Data.Input<Schema.ContentType['uid']>
  ) => Partial<EntityService.Params.Data.Input<Schema.ContentType['uid']>>;
};
