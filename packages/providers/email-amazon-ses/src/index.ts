import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import type { Providers } from '@strapi/types';
import {
  buildSendEmailCommandInput,
  getClientConfig,
  type ProviderOptions,
  type SendOptions,
} from './utils';

export default {
  init(providerOptions: ProviderOptions, settings: Providers.Email.Settings) {
    const client = new SESClient(getClientConfig(providerOptions));

    return {
      async send(options: SendOptions): Promise<void> {
        await client.send(new SendEmailCommand(buildSendEmailCommandInput(options, settings)));
      },
    };
  },
} satisfies Providers.Email.Factory;
