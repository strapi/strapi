export type DocumentInfos = {
  docVersions: {
    version: string;
    generatedDate: string;
    url: string;
  }[];
  currentVersion: string;
  prefix: string;
  documentationAccess: {
    restrictedAccess: boolean;
  };
};

export type SettingsInput = {
  restrictedAccess: boolean;
  password: string;
};
