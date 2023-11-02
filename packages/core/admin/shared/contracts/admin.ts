import { errors } from '@strapi/utils';

interface Logo {
  name: string;
  url: string;
  width: number;
  height: number;
  ext: string;
  size: number;
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
    files: Logo[];
  }
  export interface Response {
    menuLogo: Logo;
    authLogo: Logo;
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
 * /license-limit-information – get license limit information
 */

interface SSOFeature {
  name: 'sso';
}

interface AuditLogsFeature {
  name: 'audit-logs';
  options: {
    retentionDays: number | null;
  };
}

interface ReviewWorkflowsFeature {
  name: 'review-workflows';
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
      features: (SSOFeature | AuditLogsFeature | ReviewWorkflowsFeature)[];
      isHostedOnStrapiCloud: boolean;
      licenseLimitStatus: unknown;
      permittedSeats: number;
      shouldNotify: boolean;
      shouldStopCreate: boolean;
    };
    error?: errors.ApplicationError;
  }
}
