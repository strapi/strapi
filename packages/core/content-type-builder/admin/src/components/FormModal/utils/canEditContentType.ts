import get from 'lodash/get';

import { getRelationType } from '../../../utils/getRelationType';

import type { AttributeType } from '../../../types';
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
  kind: Struct.ContentTypeKind;
};

export const canEditContentType = (data: Record<string, any>, modifiedData: ModifiedData) => {
  const kind = get(data, ['contentType', 'schema', 'kind'], '');

  // if kind isn't modified or content type is a single type, there is no need to check attributes.
  if (kind === 'singleType' || kind === modifiedData.kind) {
    return true;
  }

  const contentTypeAttributes = get(
    data,
    ['contentType', 'schema', 'attributes'],
    []
  ) as AttributeType[];

  const relationAttributes = contentTypeAttributes.filter(({ relation, type, targetAttribute }) => {
    const relationType = getRelationType(relation, targetAttribute);

    return type === 'relation' && !['oneWay', 'manyWay'].includes(relationType || '');
  });

  return relationAttributes.length === 0;
};
