import type { Modules } from '@strapi/types';

import { contentTypes, types } from '@strapi/utils';
import _, { curry } from 'lodash';
import { assoc } from 'lodash/fp';

// If this has been published before, add firstPublishedAt from the old entry
const addFirstPublishedAt = async (
  uid: string,
  documentId: string,
  contentType: types.Model,
  params: Modules.Documents.Params.All
) => {
  if (!contentTypes.hasFirstPublishedAtField(contentType)) {
    return params;
  }

  const oldPublishedEntry = await strapi.db.query(uid).findOne({
    where: {
      documentId,
      publishedAt: { $ne: null },
    },
    select: ['firstPublishedAt'],
  });

  if (!oldPublishedEntry) {
    return assoc('firstPublishedAtField', { required: true, value: null }, params);
  }

  return assoc(
    'firstPublishedAtField',
    { required: true, value: oldPublishedEntry.firstPublishedAt },
    params
  );
};

const removeFirstPublishedAt = (entryData: any) => {
  return _.omit(entryData, 'firstPublishedAt');
};

const addFirstPublishedAtCurry = curry(addFirstPublishedAt);
const removeFirstPublishedAtCurry = curry(removeFirstPublishedAt);

export {
  addFirstPublishedAtCurry as addFirstPublishedAt,
  removeFirstPublishedAtCurry as removeFirstPublishedAt,
};
