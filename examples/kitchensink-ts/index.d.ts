import '@strapi/strapi';

declare module '@strapi/strapi' {
  interface StrapiInterface {
    customAddMethod(n1: number, n2: number): number;
  }
}
