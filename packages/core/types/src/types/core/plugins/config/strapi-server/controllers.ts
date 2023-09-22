import type { Strapi, Common } from '../../../../..';

// TODO Replace when we have WithStrapiCallback accessible
export type Controller = ({ strapi }: { strapi: Strapi }) => Common.Controller;

export interface Controllers {
  [key: string]: Controller;
}
