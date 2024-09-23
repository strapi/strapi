import { queryParams } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

export default (strapi: Core.Strapi) => {
  const { transformQueryParams } = queryParams.createTransformer({
    getModel: (uid: string) => strapi.getModel(uid as UID.Schema),
  });

  return {
    transform: transformQueryParams,
  };
};
