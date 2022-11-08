import { PassThrough } from 'stream-chain';
import { IProviderTransferResults, TransferStage } from '../../../types';

export const onItemPassthrough = (cb: Function) => {
  return new PassThrough({
    objectMode: true,
    transform: (data, _encoding, callback) => {
      cb();
      callback(null, data);
    },
  });
};

// TODO: refactor: it would be cleaner if we provided a base Provider class with this method (and "results") and extended all providers from there
export const providerResultsCounter = (
  results: IProviderTransferResults,
  transferStage: TransferStage
) => {
  return onItemPassthrough(() => {
    if (!results[transferStage]) {
      results![transferStage] = {
        items: 0,
      };
    }
    results![transferStage]!.items!++;
  });
};
