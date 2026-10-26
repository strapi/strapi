import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_REGISTRY_URL } from './constants';
import { EnterpriseInstallError } from './errors';

const REGISTRY_URL_VARIABLE = 'STRAPI_ENTERPRISE_REGISTRY_URL';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];

const trimTrailingSlashes = (url: string) => url.replace(/\/+$/, '');

export const resolveRegistryUrl = ({
  env,
  logger,
}: {
  env: NodeJS.ProcessEnv;
  logger: Logger;
}): string => {
  const registryUrlOverride = env[REGISTRY_URL_VARIABLE]?.trim();

  if (!registryUrlOverride) {
    return trimTrailingSlashes(ENTERPRISE_REGISTRY_URL);
  }

  let url: URL;

  try {
    url = new URL(registryUrlOverride);
  } catch {
    throw new EnterpriseInstallError(`${REGISTRY_URL_VARIABLE} is not a valid URL.`);
  }

  if (url.username || url.password) {
    throw new EnterpriseInstallError(
      `${REGISTRY_URL_VARIABLE} must not contain a user name or a password.`
    );
  }

  if (url.search || url.hash || /[?#]/.test(registryUrlOverride)) {
    throw new EnterpriseInstallError(
      `${REGISTRY_URL_VARIABLE} must not contain a query string or a fragment.`
    );
  }

  const isLocalHttp = url.protocol === 'http:' && LOCAL_HOSTNAMES.includes(url.hostname);

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new EnterpriseInstallError(
      `${REGISTRY_URL_VARIABLE} must use https, or http on localhost or 127.0.0.1, because the license is sent to it.`
    );
  }

  const registryUrl = trimTrailingSlashes(`${url.origin}${url.pathname}`);
  logger.warn(`Using the Enterprise registry at ${registryUrl} (${REGISTRY_URL_VARIABLE}).`);

  return registryUrl;
};
