import { Strapi } from '../../';

export type Controller = {
  [key: string]: (...args: any) => any;
};

export type ControllerFactory = ({ strapi: Strapi }) => Controller;
