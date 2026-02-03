import { ProviderOptions } from './models/provider-options';
import { Settings } from './models/settings';
import { SendOptions } from './models/send-options';
import { createSesClientFromProviderOptions, createSendEmailCommand } from './utils';

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    return {
      async send(options: SendOptions): Promise<void> {
        try {
          const client = createSesClientFromProviderOptions(providerOptions);
          const command = createSendEmailCommand(options, settings);
          await client.send(command);
        } catch (err: unknown) {
          if (err instanceof Error) {
            throw new Error(err.message);
          }
          throw err;
        }
      },
    };
  },
};
