import '@strapi/types';
import { DocumentManagerService } from 'src/services/document-manager';

type Services = {
  'document-manager': DocumentManagerService;
  [key: string]: any;
};

const getService = <TName extends keyof Services>(name: TName): ReturnType<Services[TName]> => {
  return strapi.plugin('content-manager').service(name as string);
};

export { getService };
