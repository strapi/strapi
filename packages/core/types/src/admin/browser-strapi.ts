import type { Features } from '../modules';

export interface BrowserStrapi {
  backendURL: string;
  isEE: boolean;
  isTrial: boolean;
  future: {
    isEnabled: (name: keyof NonNullable<Features.FeaturesConfig['future']>) => boolean;
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
    docLinks?: boolean;
  };
  projectType: 'Community' | 'Enterprise';
  telemetryDisabled: boolean;
  ai: {
    enabled: boolean;
  };
}
