import type { Features } from '../../modules';

export interface BrowserStrapi {
  backendURL: string;
  isEE: boolean;
  future: {
    isEnabled: (name: keyof NonNullable<Features.FeaturesConfig['future']>) => boolean;
  };
  /**
   * Permanent config flags from the project's `features` file. Separate from `features`
   * below, which carries EE licence feature names rather than configuration.
   */
  featureFlags: {
    isEnabled: (name: keyof Omit<Features.FeaturesConfig, 'future'>) => boolean;
  };
  features: {
    SSO: 'sso';
    AUDIT_LOGS: 'audit-logs';
    REVIEW_WORKFLOWS: 'review-workflows';
    isEnabled: (featureName?: string) => boolean;
  };
  isTrial: boolean;
  /**
   * @deprecated Use `isTrial`. Alias kept for third-party admin code that read
   * this before the rename; removed in the next major.
   */
  isTrialLicense: boolean;
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
