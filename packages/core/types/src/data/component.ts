import type { ID } from './constants';

import type { Intersect } from '../utils';
import type { AttributeNames, AttributeValueByName } from '../schema';
import type * as UID from '../uid';

/**
 * Represents a component entry.
 *
 * @template TComponentUID - The component schema UID
 * @template TComponentKeys - A union of keys to be returned in the final object. If not specified, defaults to all the keys.
 */
export type Component<
  TComponentUID extends UID.Component = UID.Component,
  TComponentKeys extends AttributeNames<TComponentUID> = AttributeNames<TComponentUID>,
> = Intersect<[{ id: ID }, Pick<AttributeValues<TComponentUID>, TComponentKeys>]>;

/**
 * @internal
 */
type AttributeValues<TComponentUID extends UID.Component = UID.Component> = {
  [TAttributeName in AttributeNames<TComponentUID>]?: AttributeValueByName<
    TComponentUID,
    TAttributeName
  > | null;
};
