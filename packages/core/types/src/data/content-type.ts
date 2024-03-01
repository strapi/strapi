import type { ID } from './constants';

import type { Intersect } from '../utils';
import type { UID } from '../public';
import type { AttributeNames, AttributeValueByName } from '../schema';

export type DocumentID = string;

export type ContentType<
  TContentTypeUID extends UID.ContentType = UID.ContentType,
  TContentTypeKeys extends AttributeNames<TContentTypeUID> = AttributeNames<TContentTypeUID>
> = Intersect<
  [{ id: ID; documentId: DocumentID }, Pick<AttributeValues<TContentTypeUID>, TContentTypeKeys>]
>;

type AttributeValues<TContentTypeUID extends UID.ContentType = UID.ContentType> = {
  [TAttributeName in AttributeNames<TContentTypeUID>]?: AttributeValueByName<
    TContentTypeUID,
    TAttributeName
  > | null;
};
