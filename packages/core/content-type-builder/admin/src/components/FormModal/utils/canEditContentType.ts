import get from 'lodash/get';

import { getRelationType } from '../../../utils/getRelationType';

import type { Schema, Attribute } from '@strapi/types';

export type EditableContentTypeData = {
  contentType: {
    schema: {
      kind: Schema.ContentTypeKind;
      attributes: {
        relation: Attribute.RelationKind.WithTarget;
        type: string;
        targetAttribute: string;
      }[];
    };
  };
};

type ModifiedData = {
  kind: Schema.ContentTypeKind;
};

export const canEditContentType = (data: EditableContentTypeData, modifiedData: ModifiedData) => {
  const kind = get(data, ['contentType', 'schema', 'kind'], '');

  // if kind isn't modified or content type is a single type, there is no need to check attributes.
  if (kind === 'singleType' || kind === modifiedData.kind) {
    return true;
  }

  const contentTypeAttributes = get(
    data,
    ['contentType', 'schema', 'attributes'],
    []
  ) as EditableContentTypeData['contentType']['schema']['attributes'];

  const relationAttributes = contentTypeAttributes.filter(({ relation, type, targetAttribute }) => {
    const relationType = getRelationType(relation, targetAttribute);

    return type === 'relation' && !['oneWay', 'manyWay'].includes(relationType);
  });

  return relationAttributes.length === 0;
};
