import type { ID } from './constants';

import type { Intersect } from '../utils';
import type { AttributeNames, AttributeValueByName, RequiredAttributeNames } from '../schema';
import type * as UID from '../uid';

// AttributeNames<TComponentUID>

/**
 * Represents a component entry.
 *
 * @template TComponentUID - The component schema UID
 * @template TComponentKeys - A union of keys to be returned in the final object. If not specified, defaults to all the keys.
 */
export type Component<
  TComponentUID extends UID.Component = UID.Component,
  TComponentKeys extends AttributeNames<TComponentUID> = AttributeNames<TComponentUID>,
> = Intersect<
  [
    { id: ID },
    Pick<
      AttributeValues<TComponentUID>,
      Extract<TComponentKeys, keyof AttributeValues<TComponentUID>>
    >,
  ]
>;

/**
 * @internal
 */
type AttributeValues<TComponentUID extends UID.Component = UID.Component> = {
  [TAttributeName in Exclude<
    AttributeNames<TComponentUID>,
    RequiredAttributeNames<TComponentUID>
  >]?: AttributeValueByName<TComponentUID, TAttributeName> | null;
} & {
  [TAttributeName in AttributeNames<TComponentUID> &
    RequiredAttributeNames<TComponentUID>]: AttributeValueByName<TComponentUID, TAttributeName>;
};
