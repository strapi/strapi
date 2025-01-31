import get from 'lodash/get';

import { getRelationType } from '../../../utils/getRelationType';

import type { AttributeType, ContentType } from '../../../types';
import type { Internal, Struct } from '@strapi/types';

export type EditableContentTypeSchema = {
  kind: Struct.ContentTypeKind;
  name: string;
  attributes: AttributeType[];
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
  const kind = get(type, ['schema', 'kind'], '');

  // if kind isn't modified or content type is a single type, there is no need to check attributes.
  if (kind === 'singleType' || kind === modifiedData.kind) {
    return true;
  }

  const contentTypeAttributes: AttributeType[] = type?.schema?.attributes ?? [];

  const relationAttributes = contentTypeAttributes.filter(({ relation, type, targetAttribute }) => {
    const relationType = getRelationType(relation, targetAttribute);

    return type === 'relation' && !['oneWay', 'manyWay'].includes(relationType || '');
  });

  return relationAttributes.length === 0;
};
