import { StrapiInterface } from '@strapi/strapi';

// Foo service
export default ({ strapi }: { strapi: StrapiInterface }) => ({
  bar(message: string) {
    console.log('Hello from my Typescript plugin!');
    console.log(message);
  },
});
