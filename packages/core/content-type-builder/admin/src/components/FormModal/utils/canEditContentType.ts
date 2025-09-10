import { getRelationType } from '../../../utils/getRelationType';

import type { AnyAttribute, ContentType } from '../../../types';
import type { Internal, Struct } from '@strapi/types';

export type EditableContentTypeSchema = {
  kind: Struct.ContentTypeKind;
  name: string;
  attributes: AnyAttribute[];
};

export type EditableContentTypeData = {
  contentType: {
    uid: Internal.UID.ContentType;
    schema: EditableContentTypeSchema;
  };
};

type ModifiedData = {
  kind?: Struct.ContentTypeKind;
};

export const canEditContentType = (type: ContentType, modifiedData: ModifiedData) => {
  const kind = type.kind;

  // if kind isn't modified or content type is a single type, there is no need to check attributes.
  if (kind === 'singleType' || kind === modifiedData.kind) {
    return true;
  }

  const contentTypeAttributes: AnyAttribute[] = type?.attributes ?? [];

  const relationAttributes = contentTypeAttributes.filter((attribute) => {
    if (attribute.type !== 'relation') {
      return false;
    }

    const { relation, targetAttribute } = attribute;
    const relationType = getRelationType(relation, targetAttribute);

    return !['oneWay', 'manyWay'].includes(relationType || '');
  });

  return relationAttributes.length === 0;
};
