import { env } from '@strapi/utils';
import { getService } from '../../utils';

/**
 * Returns whether the data transfer features have been disabled from the env configuration
 */
const isDisabledFromEnv = (): boolean => {
  return env.bool('STRAPI_DISABLE_REMOTE_DATA_TRANSFER', false) as boolean;
};

/**
 * A valid transfer token salt must be a non-empty string defined in the Strapi config
 */
const hasValidTokenSalt = (): boolean => {
  const salt = strapi.config.get('admin.transfer.token.salt', null) as string | null;

  return typeof salt === 'string' && salt.length > 0;
};

/**
 * Checks whether data transfer features are enabled
 */
const isDataTransferEnabled = (): boolean => {
  const { utils } = getService('transfer');

  return !utils.isDisabledFromEnv() && utils.hasValidTokenSalt();
};

export { isDataTransferEnabled, isDisabledFromEnv, hasValidTokenSalt };
