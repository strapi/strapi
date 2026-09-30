import type { Modules, Struct, UID } from '@strapi/types';
import type { errors } from '@strapi/utils';
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
 * /project-type - the edition, license and flags the admin boots with.
 *
 * Served by the CE admin controller in every edition; the admin builds `window.strapi` from it.
 */
export declare namespace GetProjectType {
  export interface Request {
    body: {};
    query: {};
  }
  export interface Response {
    data: {
      isEE: boolean;
      isTrial: boolean;
      /**
       * The name of every license feature, without options: the route is public. Options are
       * only served to authenticated admins, by /license-limit-information.
       */
      features: Array<Pick<LicenseFeatureEntry, 'name'>>;
      flags: {
        promoteEE?: boolean;
        nps?: boolean;
        docLinks?: boolean;
      };
      ai: { enabled: boolean };
      /** EE only — the license type. */
      type?: string;
      /** EE only — distinguishes the Growth plan from other Enterprise plans. */
      planPriceId?: string;
      /** Plan label for display: `Community`, `Growth` or `Enterprise`. */
      projectType?: Modules.EE.Edition;
    };
    error?: errors.ApplicationError;
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
      numberOfContentTypeFolders: number;
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
 * License features, from the catalog in `@strapi/types` (`Public.LicenseFeatures`).
 */
export type LicenseFeature = Modules.EE.Feature;

/** A feature as the license lists it, including names this version of Strapi does not know. */
export type LicenseFeatureEntry = ReturnType<Modules.EE.EEService['features']['list']>[number];

export type SSOFeature = Modules.EE.Feature<'sso'>;
export type AuditLogsFeature = Modules.EE.Feature<'audit-logs'>;
export type ReviewWorkflowsFeature = Modules.EE.Feature<'review-workflows'>;
export type ContentReleasesFeature = Modules.EE.Feature<'cms-content-releases'>;
export type ContentHistoryFeature = Modules.EE.Feature<'cms-content-history'>;

/**
 * /license-limit-information – get license limit information
 *
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
      features: LicenseFeature[];
      isHostedOnStrapiCloud: boolean;
      licenseLimitStatus: 'OVER_LIMIT' | 'AT_LIMIT' | null;
      /** Undefined without a seat limit. */
      permittedSeats?: number;
      shouldNotify: boolean;
      shouldStopCreate: boolean;
      /** EE only — the license type. */
      type?: string;
      isTrial: boolean;
    };
    error?: errors.ApplicationError;
  }
}

/**
 * Meta data for the guided tour
 */
export declare namespace GetGuidedTourMeta {
  export interface Request {}

  export interface Response {
    data: {
      isFirstSuperAdminUser: boolean;
      schemas: Record<UID.ContentType, Struct.ContentTypeSchema>;
    };
    error?: errors.ApplicationError;
  }
}
