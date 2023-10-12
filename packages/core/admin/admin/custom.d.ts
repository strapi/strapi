export {};

import { StrapiTheme } from '@strapi/design-system';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StrapiTheme {}
}

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      isEE: boolean;
      features: {
        SSO: 'sso';
        AUDIT_LOGS: 'audit-logs';
        REVIEW_WORKFLOWS: 'review-workflows';
        isEnabled: (featureName?: string) => boolean;
      };
      flags: {
        nps?: boolean;
      };
      projectType: 'Community' | 'Enterprise';
      telemetryDisabled: boolean;
    };
  }
}
