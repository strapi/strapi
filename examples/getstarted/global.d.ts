interface Restaurant {
  name: string;
}

declare module '@strapi/strapi' {
  /**
   * augment strapi.query(T)
   */
  export interface StrapiContentTypes {
    restaurant: Restaurant;
  }

  /**
   * augment strapi.container.get('services') => strapi.container.get('services').get('restaurant')?.fooService
   * augment strapi.services => strapi.service('restaurant')?.fooService
   */
  export interface StrapiServices {
    restaurant: {
      fooService: {
        bar: () => string;
      };
    };
  }

  /**
   * augment strapi.container.get
   */
  interface StrapiRegistries {
    custom: {
      bar(): 'test';
    };
  }
}

export {};
