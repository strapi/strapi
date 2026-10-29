import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_REGISTRY_URL } from './constants';
import { EnterpriseInstallError } from './errors';

const REGISTRY_OPTION = '--registry';
const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '[::1]'];
const STRAPI_DOMAIN_SUFFIXES = ['.strapi.io', '.strapi.team'];

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

  const isHttps = url.protocol === 'https:';
  const isLocal = (isHttps || url.protocol === 'http:') && LOCAL_HOSTNAMES.includes(url.hostname);
  const isStrapiServer =
    isHttps && STRAPI_DOMAIN_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix));

  if (!isLocal && !isStrapiServer) {
    throw new EnterpriseInstallError(
      `${REGISTRY_OPTION} must be http(s) on localhost, 127.0.0.1 or [::1], or https on a strapi.io or strapi.team server, because the license is sent to it.`
    );
  }

  const registryUrl = trimTrailingSlashes(`${url.origin}${url.pathname}`);
  logger.warn(`Using the Enterprise registry at ${registryUrl} (${REGISTRY_OPTION}).`);

  return registryUrl;
};
