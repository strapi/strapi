import { StrapiInterface } from '@strapi/strapi';

const services = {
  foo: ({ strapi }: { strapi: StrapiInterface }) => ({
    bar(message: string) {
      console.log('Hello from my Typescript plugin!');
      console.log(message);
    },
  }),
};

export default services;
