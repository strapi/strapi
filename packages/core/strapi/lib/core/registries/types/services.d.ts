import { Strapi } from '../../types';

export type Service = {
  [key: string]: (...args: any) => any;
};

export type ServiceFactory = ({ strapi: Strapi }) => Service;
