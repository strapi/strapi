import { errors } from '@strapi/utils';
import type { File } from 'formidable';

export interface Logo {
  name: string;
  url: string;
  width: number;
  height: number;
  ext: string;
  size: number;
}

/**
 * /init - Initialize the admin panel
 */
export declare namespace Init {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      uuid: string | false;
      hasAdmin: boolean;
      menuLogo: string | null;
      authLogo: string | null;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * /project-settings - Get the project settings
 */
export declare namespace GetProjectSettings {
  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    menuLogo: Logo;
    authLogo: Logo;
    error?: errors.ApplicationError;
  }
}

/**
 * /project-settings - Update the project settings
 */
export declare namespace UpdateProjectSettings {
  export interface Request {
    body: {
      menuLogo: Logo | null;
      authLogo: Logo | null;
    };
    query: {};
    files: {
      menuLogo?: File | null;
      authLogo?: File | null;
    };
  }
  export interface Response {
    menuLogo: Partial<Logo>;
    authLogo: Partial<Logo>;
    error?: errors.ApplicationError | errors.YupValidationError;
  }
}

/**
 * /information - get project information
 */
export declare namespace Information {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      currentEnvironment: string;
      autoReload: boolean;
      strapiVersion: string | null;
      dependencies: Record<string, string>;
      projectId: string | null;
      nodeVersion: string;
      communityEdition: boolean;
      useYarn: boolean;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * /telemetry-properties - get telemetry properties
 */
export declare namespace TelemetryProperties {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      useTypescriptOnServer: boolean;
      useTypescriptOnAdmin: boolean;
      isHostedOnStrapiCloud: boolean;
      numberOfAllContentTypes: number;
      numberOfComponents: number;
      numberOfDynamicZones: number;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * /plugins - get plugin information
 */
export declare namespace Plugins {
  interface Plugin {
    name: string;
    displayName: string;
    description: string;
    packageName: string;
  }

  export interface Request {
    body: {};
    query: {};
  }

  export interface Response {
    plugins: Plugin[];
    error?: errors.ApplicationError;
  }
}

/**
 * /providers/options - Single Sign On setting options
 */
export declare namespace ProvidersOptions {
  interface SSOProviderOptions {
    autoRegister: boolean;
    defaultRole: string | null;
    ssoLockedRoles: string[] | null;
  }
  export interface Request {
    body: SSOProviderOptions;
    query: {};
  }

  export interface Response {
    data: SSOProviderOptions;
    error?: errors.ApplicationError | errors.ValidationError | errors.YupValidationError;
  }
}

/**
 * /license-limit-information – get license limit information
 */

export interface SSOFeature {
  name: 'sso';
}

export interface AuditLogsFeature {
  name: 'audit-logs';
  options: {
    retentionDays: number | null;
  };
}

export interface ReviewWorkflowsFeature {
  name: 'review-workflows';
  options?: { numberOfWorkflows: number | null; stagesPerWorkflow: number | null };
}

export interface ContentReleasesFeature {
  name: 'cms-content-releases';
  options?: {
    maximumReleases: number;
  };
}

export interface ContentHistoryFeature {
  name: 'cms-content-history';
  options: {
    retentionDays: number;
  };
}

/**
 * TODO: this response needs refactoring because we're mixing the admin seat limit info with
 * regular EE feature info.
 */
export declare namespace GetLicenseLimitInformation {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      currentActiveUserCount: number;
      enforcementUserCount: number;
      features: (
        | SSOFeature
        | AuditLogsFeature
        | ReviewWorkflowsFeature
        | ContentReleasesFeature
        | ContentHistoryFeature
      )[];
      isHostedOnStrapiCloud: boolean;
      licenseLimitStatus: unknown;
      permittedSeats: number;
      shouldNotify: boolean;
      shouldStopCreate: boolean;
    };
    error?: errors.ApplicationError;
  }
}
