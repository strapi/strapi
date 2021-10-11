interface Restaurant {
  name: string;
}

declare module "@strapi/strapi" {

  /**
   * augment strapi.entityService
   */
  interface StrapiModels {
    restaurant: Restaurant;
  }

  /**
   * augment strapi.container.get
   */
  interface StrapiRegistries {
    custom: {
      bar(): 'test'
    }
  }
}

export {};
