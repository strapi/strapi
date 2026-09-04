import type { Features } from '../../modules';

export interface BrowserStrapi {
  backendURL: string;
  isEE: boolean;
  isTrial: boolean;
  /**
   * @deprecated Use `isTrial`. Alias kept for third-party admin code that read
   * this before the rename; removed in the next major.
   */
  isTrialLicense: boolean;
  future: {
    isEnabled: (name: keyof NonNullable<Features.FeaturesConfig['future']>) => boolean;
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
  telemetryDisabled: boolean;
  ai: {
    enabled: boolean;
  };
}
