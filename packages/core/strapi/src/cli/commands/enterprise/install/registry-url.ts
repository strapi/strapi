import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_REGISTRY_URL } from './constants';
import { EnterpriseInstallError } from './errors';

const REGISTRY_OPTION = '--registry';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1'];

const trimTrailingSlashes = (url: string) => url.replace(/\/+$/, '');

export const resolveRegistryUrl = ({
  registry,
  logger,
}: {
  registry: string | undefined;
  logger: Logger;
}): string => {
  if (registry === undefined) {
    return trimTrailingSlashes(ENTERPRISE_REGISTRY_URL);
  }

  const registryUrlOverride = registry.trim();

  if (!registryUrlOverride) {
    throw new EnterpriseInstallError(`${REGISTRY_OPTION} must not be empty.`);
  }

  let url: URL;

  try {
    url = new URL(registryUrlOverride);
  } catch {
    throw new EnterpriseInstallError(`${REGISTRY_OPTION} is not a valid URL.`);
  }

  if (url.username || url.password) {
    throw new EnterpriseInstallError(
      `${REGISTRY_OPTION} must not contain a user name or a password.`
    );
  }

  if (url.search || url.hash || /[?#]/.test(registryUrlOverride)) {
    throw new EnterpriseInstallError(
      `${REGISTRY_OPTION} must not contain a query string or a fragment.`
    );
  }

  const isLocalHttp = url.protocol === 'http:' && LOCAL_HOSTNAMES.includes(url.hostname);

  if (url.protocol !== 'https:' && !isLocalHttp) {
    throw new EnterpriseInstallError(
      `${REGISTRY_OPTION} must use https, or http on localhost or 127.0.0.1, because the license is sent to it.`
    );
  }

  const registryUrl = trimTrailingSlashes(`${url.origin}${url.pathname}`);
  logger.warn(`Using the Enterprise registry at ${registryUrl} (${REGISTRY_OPTION}).`);

  return registryUrl;
};
