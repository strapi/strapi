import '@strapi/types';

import type { DocumentManagerService } from '../services/document-manager';
import type DocumentMetadata from '../services/document-metadata';
import type contentStructure from '../services/content-structure';

type Services = {
  'content-structure': typeof contentStructure;
  'document-manager': DocumentManagerService;
  'document-metadata': typeof DocumentMetadata;
  [key: string]: any;
};

const getService = <TName extends keyof Services>(name: TName): ReturnType<Services[TName]> => {
  return strapi.plugin('content-manager').service(name as string);
};

export { getService };
