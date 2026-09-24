export {};

declare global {
  namespace Strapi {
    namespace Registries {
      interface Settings {
        strict: true;
      }
    }
  }
}
