import type { OpenAPIV3_1 } from 'openapi-types';

import type { PluginConfig } from '../../../types';

type ConfigInfo = PluginConfig['info'];

type DocumentationInfo = Partial<OpenAPIV3_1.InfoObject> & {
  'x-generation-date': string;
};

const isNonEmptyString = (value?: string) => typeof value === 'string' && value.trim().length > 0;

const isContactConfigured = (contact?: OpenAPIV3_1.ContactObject) => {
  if (!contact) {
    return false;
  }

  return [contact.name, contact.email, contact.url].some(isNonEmptyString);
};

const isLicenseConfigured = (license?: OpenAPIV3_1.LicenseObject) => {
  if (!license) {
    return false;
  }

  return isNonEmptyString(license.name) || isNonEmptyString(license.url);
};

export const mergeInfoConfig = (configInfo: ConfigInfo | undefined): DocumentationInfo => {
  const info: DocumentationInfo = {
    'x-generation-date': new Date().toISOString(),
  };

  const version = configInfo?.version;

  if (isNonEmptyString(version)) {
    info.version = version;
  }

  const title = configInfo?.title;

  if (isNonEmptyString(title)) {
    info.title = title;
  }

  const description = configInfo?.description;

  if (isNonEmptyString(description)) {
    info.description = description;
  }

  if (isContactConfigured(configInfo?.contact)) {
    info.contact = configInfo!.contact;
  }

  if (isLicenseConfigured(configInfo?.license)) {
    info.license = configInfo!.license;
  }

  return info;
};
