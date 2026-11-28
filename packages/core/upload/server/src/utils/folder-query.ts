import { errors, traverse } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { FILE_MODEL_UID, FOLDER_MODEL_UID } from '../constants';

// `file.folder` is private, so a folder can't be looked up through its files either.
const throwFileRelations: Parameters<typeof traverse.traverseQueryFilters>[0] = ({
  key,
  attribute,
  path,
}) => {
  if (attribute?.type === 'relation' && attribute.target === FILE_MODEL_UID) {
    throw new errors.ValidationError(`Invalid key ${key}`, { key, path: path.attribute });
  }
};

export const assertNoFileRelations = async (
  strapi: Core.Strapi,
  { filters, sort }: { filters?: unknown; sort?: unknown }
) => {
  const options = {
    schema: strapi.getModel(FOLDER_MODEL_UID),
    getModel: strapi.getModel.bind(strapi),
  };

  await traverse.traverseQueryFilters(throwFileRelations, options, filters);
  await traverse.traverseQuerySort(throwFileRelations, options, sort);
};
