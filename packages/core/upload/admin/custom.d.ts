export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      future: {
        isEnabled: (name: keyof NonNullable<Modules.Features.FeaturesConfig['future']>) => boolean;
      };
      featureFlags: {
        isEnabled: (name: keyof Omit<Modules.Features.FeaturesConfig, 'future'>) => boolean;
      };
    };
  }
  module '*?raw';
}
