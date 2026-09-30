export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      isEE: boolean;
      features: {
        SSO: 'sso';
        // TODO @Nico type as `Modules.EE.FeatureName` once this package depends on @strapi/types
        isEnabled: (featureName?: string) => boolean;
      };
      future: {
        isEnabled: (name: string) => boolean;
      };
      featureFlags: {
        isEnabled: (name: string) => boolean;
      };
      projectType: string;
      hasSeatLimit: boolean;
      telemetryDisabled: boolean;
      flags: {
        nps: boolean;
        promoteEE: boolean;
      };
    };
  }
}
