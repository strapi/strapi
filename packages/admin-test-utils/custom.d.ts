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
      projectType: string;
      telemetryDisabled: boolean;
    };
  }
}
