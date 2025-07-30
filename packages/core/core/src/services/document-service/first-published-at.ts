import { contentTypes } from '@strapi/utils';
import { assoc } from 'lodash/fp';
import type { Modules, Schema } from '@strapi/types';

type EntriesUpdate = (entryToUpdate: any, param?: any) => Promise<any>;
type ParamsTransform = (params: Modules.Documents.Params.All) => Modules.Documents.Params.All;

const addFirstPublishedAtToDraft = async (
  draft: any,
  update: EntriesUpdate,
  contentType: Schema.ContentType
) => {
  if (!contentTypes.hasFirstPublishedAtField(contentType)) {
    return draft;
  }

  if (draft.firstPublishedAt) {
    return draft;
  }

  return update(draft, {
    data: {
      firstPublishedAt: Date.now(),
    },
  });
};

const filterDataFirstPublishedAt: ParamsTransform = (params) => {
  if (params?.data?.firstPublishedAt) {
    return assoc(['data', 'firstPublishedAt'], null, params);
  }

  return params;
};

export { addFirstPublishedAtToDraft, filterDataFirstPublishedAt };
