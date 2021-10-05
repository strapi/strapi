import { StrapiInterface } from '@strapi/strapi';

export type ServiceMap = { [key: string]: (options: { strapi: StrapiInterface }) => object };

const services: ServiceMap = {
  foo: ({ strapi }) => ({
    async bar() {
      //   strapi.entityService.find()
      console.log('Hello from my Typescript plugin!');
    },
  }),
};

export default services;
