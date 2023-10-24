import { errors } from '@strapi/utils';
import { ValidationError as YupValidationError } from 'yup';

// TODO replace SettingsFile with type from the upload plugin ?
interface Logo {
  name: string;
  url: string;
  width: number;
  height: number;
  ext: string;
  size: number;
}

export type SettingsFile = any;

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
      menuLogo?: SettingsFile;
      authLogo?: SettingsFile;
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
    menuLogo: SettingsFile;
    authLogo: SettingsFile;
    error?: errors.ApplicationError;
  }
}

/**
 * /project-settings - Update the project settings
 */
export declare namespace UpdateProjectSettings {
  export interface Request {
    body: {
      menuLogo: SettingsFile;
      authLogo: SettingsFile;
    };
    query: {};
    files: SettingsFile[];
  }
  export interface Response {
    menuLogo: SettingsFile;
    authLogo: SettingsFile;
    error?: errors.ApplicationError | YupValidationError;
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
