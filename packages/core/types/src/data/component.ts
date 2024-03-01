import type { ID } from './constants';

import type { Intersect } from '../utils';
import type { AttributeNames, AttributeValueByName } from '../schema';
import type { UID } from '../public';

export type Component<
  TComponentUID extends UID.Component = UID.Component,
  TComponentKeys extends AttributeNames<TComponentUID> = AttributeNames<TComponentUID>
> = Intersect<[{ id: ID }, Pick<AttributeValues<TComponentUID>, TComponentKeys>]>;

type AttributeValues<TComponentUID extends UID.Component = UID.Component> = {
  [TAttributeName in AttributeNames<TComponentUID>]?: AttributeValueByName<
    TComponentUID,
    TAttributeName
  > | null;
};
