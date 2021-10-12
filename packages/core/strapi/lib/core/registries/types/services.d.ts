import { Strapi } from '../../types';

export type Service = {
  [key: string]: any;
};

export type ServiceFactory = ({ strapi: Strapi }) => Service;
