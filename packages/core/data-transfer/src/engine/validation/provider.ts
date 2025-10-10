import { capitalize } from 'lodash/fp';

import type { IDestinationProvider, ISourceProvider, ProviderType } from '../../../types';
import { TransferEngineValidationError } from '../errors';

const reject = (reason: string): never => {
  throw new TransferEngineValidationError(`Invalid provider supplied. ${reason}`);
};

const validateProvider = <T extends ProviderType>(
  type: ProviderType,
  provider?: ([T] extends ['source'] ? ISourceProvider : IDestinationProvider) | null
) => {
  if (!provider) {
    return reject(
      `Expected an instance of "${capitalize(type)}Provider", but got "${typeof provider}" instead.`
    );
  }

  if (provider.type !== type) {
    return reject(
      `Expected the provider to be of type "${type}" but got "${provider.type}" instead.`
    );
  }
};

export { validateProvider };
