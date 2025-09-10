/// <reference types="vite/client" />

import { type StrapiTheme } from '@strapi/design-system';

import type { Modules } from '@strapi/types';

declare module 'styled-components' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface DefaultTheme extends StrapiTheme {}
}

interface BrowserStrapi {
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
  isTrialLicense: boolean;
  flags: {
    promoteEE?: boolean;
    nps?: boolean;
  };
  projectType: 'Community' | 'Enterprise';
  telemetryDisabled: boolean;
}

declare global {
  interface Window {
    strapi: BrowserStrapi;
  }
}
