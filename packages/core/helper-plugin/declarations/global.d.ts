export {};

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      telemetryDisabled: boolean;
      projectType: 'Enterprise' | 'Community';
    };
  }
}
