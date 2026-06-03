import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import {
  buildSendEmailCommandInput,
  getClientConfig,
  type ProviderOptions,
  type ProviderSettings,
  type SendOptions,
} from './utils';

export default {
  init(providerOptions: ProviderOptions, settings: ProviderSettings) {
    const client = new SESClient(getClientConfig(providerOptions));

    return {
      async send(options: SendOptions): Promise<void> {
        await client.send(new SendEmailCommand(buildSendEmailCommandInput(options, settings)));
      },
    };
  },
};
