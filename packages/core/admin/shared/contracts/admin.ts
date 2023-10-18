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
  export interface Response {
    data: {
      uuid: string | false;
      hasAdmin: boolean;
      menuLogo?: SettingsFile;
      authLogo?: SettingsFile;
    };
  }
}

/**
 * /project-settings - Get the project settings
 */
export declare namespace GetProjectSettings {
  export interface Response {
    menuLogo: SettingsFile;
    authLogo: SettingsFile;
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
    files: SettingsFile[];
  }
  export interface Response {
    menuLogo: SettingsFile;
    authLogo: SettingsFile;
  }
}

/**
 * /information - get project information
 */
export declare namespace Information {
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
  }
}

/**
 * /telemetry-properties - get telemetry properties
 */
export declare namespace TelemetryProperties {
  export interface Response {
    data: {
      useTypescriptOnServer: boolean;
      useTypescriptOnAdmin: boolean;
      isHostedOnStrapiCloud: boolean;
      numberOfAllContentTypes: number;
      numberOfComponents: number;
      numberOfDynamicZones: number;
    };
  }
}

/**
 * /plugins - get plugin information
 */
export declare namespace Plugins {
  // TODO should this type come from elsewhere ?
  interface Plugin {
    name: string;
    displayName: string;
    description: string;
  }

  export interface Response {
    plugins: Plugin[];
  }
}
