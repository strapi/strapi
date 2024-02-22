import '@strapi/types';
import { CollectionTypesService } from 'src/services/collection-types';
import { SingleTypesService } from 'src/services/single-types';

type Services = {
  'collection-types': CollectionTypesService;
  'single-types': SingleTypesService;
  // TODO: Add rest of service
  [key: string]: any;
};

const getService = <TName extends keyof Services>(name: TName): ReturnType<Services[TName]> => {
  return strapi.plugin('content-manager').service(name as string);
};

export { getService };
