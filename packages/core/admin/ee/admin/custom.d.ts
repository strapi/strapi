/// <reference types="vite/client" />

import { type StrapiTheme } from '@strapi/design-system';

import type { Modules } from '@strapi/types';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StrapiTheme {}
}

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      isEE: boolean;
      future: {
        isEnabled: (name: keyof NonNullable<Modules.Features.FeaturesConfig['future']>) => boolean;
      };
      features: {
        SSO: 'sso';
        AUDIT_LOGS: 'audit-logs';
        REVIEW_WORKFLOWS: 'review-workflows';
        isEnabled: (featureName?: string) => boolean;
      };
      flags: {
        promoteEE?: boolean;
        nps?: boolean;
        docLinks?: boolean;
      };
      projectType: 'Community' | 'Growth' | 'Enterprise';
      /** Display-only license state; never a feature gate. Keep in sync with admin/custom.d.ts. */
      licenseStatus: 'none' | 'active' | 'expired' | 'unknown';
      /** Display-only plan label, retained across expiry. Keep in sync with admin/custom.d.ts. */
      licensedPlan: 'Community' | 'Growth' | 'Enterprise';
      telemetryDisabled: boolean;
      ai: {
        enabled: boolean;
      };
    };
  }
}
