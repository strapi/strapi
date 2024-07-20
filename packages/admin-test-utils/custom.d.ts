export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      isEE: boolean;
      features: {
        SSO: 'sso';
        isEnabled: (featureName?: string) => boolean;
      };
      future: {
        isEnabled: (name: string) => boolean;
      };
      projectType: string;
      telemetryDisabled: boolean;
      flags: {
        nps: boolean;
        promoteEE: boolean;
      };
    };
  }
}
