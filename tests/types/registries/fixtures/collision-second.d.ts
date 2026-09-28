export {};

declare global {
  namespace Strapi {
    namespace Registries {
      interface PackageServices {
        'plugin::collision.example': { version: 'second' };
      }
    }
  }
}
