import '@strapi/types';

import { DocumentManagerService } from 'src/services/document-manager';
import DocumentMetadata from 'src/services/document-metadata';

type Services = {
  'document-manager': DocumentManagerService;
  'document-metadata': typeof DocumentMetadata;
  [key: string]: any;
};

const getService = <TName extends keyof Services>(name: TName): ReturnType<Services[TName]> => {
  return strapi.plugin('content-manager').service(name as string);
};

export { getService };
