/// <reference types="vite/client" />

import type { Modules } from '@strapi/types';

declare global {
  interface Window {
    strapi: {
      backendURL: string;
      isEE: boolean;
      features: {
        SSO: 'sso';
        AUDIT_LOGS: 'audit-logs';
        REVIEW_WORKFLOWS: 'review-workflows';
        isEnabled: (name: Modules.EE.FeatureName) => boolean;
      };
      future: {
        isEnabled: (name: string) => boolean;
      };
      flags: {
        nps?: boolean;
        promoteEE?: boolean;
      };
      projectType: 'Community' | 'Enterprise';
      telemetryDisabled: boolean;
    };
  }
}
