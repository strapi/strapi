export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      future: {
        isEnabled: (name: keyof NonNullable<Modules.Features.FeaturesConfig['future']>) => boolean;
      };
    };
  }
  declare module '*?raw';
}
