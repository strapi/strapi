import type { Data } from '@strapi/types';

import type { HistoryVersionAuthorType } from '../../../../shared/contracts/history-versions';

export interface HistoryAuthorProvider {
  strategy: string;
  type: HistoryVersionAuthorType;
  model: string;
  getRecordId: (credentials: { id?: Data.ID } | null | undefined) => Data.ID | null | undefined;
  findNames: (documentIds: string[]) => Promise<Record<string, string>>;
}

const createHistoryAuthorsService = () => {
  const providersByStrategy = new Map<string, HistoryAuthorProvider>();
  const findNamesByModel = new Map<string, HistoryAuthorProvider['findNames']>();

  return {
    registerProvider(provider: HistoryAuthorProvider) {
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
