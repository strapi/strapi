export {};

declare global {
  namespace Strapi {
    namespace Registries {
      interface DefaultServices {
        'plugin::collision.example': { version: 'first' };
      }
    }
  }
}
