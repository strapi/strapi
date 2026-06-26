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

  const now = new Date();

  // Persist to the draft DB row, but discard the return value: entries.update
  // returns an unpopulated findOne (no populate is passed through), which would
  // strip media, components, dynamic zones and relations from the draft that
  // downstream publishEntry relies on. Instead we carry forward the already
  // populated draft from repository.publish's findMany with the field merged in.
  await update(draft, {
    data: { firstPublishedAt: now },
  });

  return { ...draft, firstPublishedAt: now };
};

const filterDataFirstPublishedAt: ParamsTransform = (params) => {
  if (params?.data?.firstPublishedAt) {
    return assoc(['data', 'firstPublishedAt'], null, params);
  }

  return params;
};

export { addFirstPublishedAtToDraft, filterDataFirstPublishedAt };
