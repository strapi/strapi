import type { Data } from '@strapi/types';

import type { HistoryVersionAuthorType } from '../../../../shared/contracts/history-versions';

interface HistoryAuthorIdentity {
  id?: Data.ID;
}

export interface HistoryAuthorInput {
  credentials: HistoryAuthorIdentity | null | undefined;
  user: HistoryAuthorIdentity | null | undefined;
}

export interface HistoryAuthorProvider {
  strategy: string;
  type: HistoryVersionAuthorType;
  model: string;
  getRecordId: (input: HistoryAuthorInput) => Data.ID | null | undefined;
  findNames: (documentIds: string[]) => Promise<Record<string, string>>;
}

const createHistoryAuthorsService = () => {
  const providersByStrategy = new Map<string, HistoryAuthorProvider>();
  const findNamesByModel = new Map<string, HistoryAuthorProvider['findNames']>();

  return {
    /**
     * Registers a provider that finds the author names for one authentication strategy.
     * This method is internal and can change without notice.
     *
     * @internal
     */
    unstable_registerProvider(provider: HistoryAuthorProvider) {
      if (providersByStrategy.has(provider.strategy)) {
        throw new Error(
          `History author provider for strategy ${provider.strategy} has already been registered.`
        );
      }

      providersByStrategy.set(provider.strategy, provider);

      if (!findNamesByModel.has(provider.model)) {
        findNamesByModel.set(provider.model, provider.findNames);
      }
    },

    findProviderByStrategy(strategy: string) {
      return providersByStrategy.get(strategy);
    },

    async findNames(model: string, documentIds: string[]): Promise<Record<string, string>> {
      const findNames = findNamesByModel.get(model);

      return findNames ? findNames(documentIds) : {};
    },
  };
};

export { createHistoryAuthorsService };
