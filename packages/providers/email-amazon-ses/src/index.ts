import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { SESClientConfig } from '@aws-sdk/client-ses';
import { ProviderOptions } from './models/provider-options';
import { isLegacyOptions, extractRegionFromUrl, toAddressList } from './utils';
import { Settings } from './models/settings';
import { SendOptions } from './models/send-options';

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    let clientConfig: SESClientConfig;

    if (isLegacyOptions(providerOptions)) {
      // Backwards compatibility: convert legacy node-ses options to AWS SDK config
      const region = providerOptions.amazon
        ? extractRegionFromUrl(providerOptions.amazon)
        : undefined;

      clientConfig = {
        region: region || 'us-east-1',
        credentials: {
          accessKeyId: providerOptions.key,
          secretAccessKey: providerOptions.secret,
        },
      };
    } else {
      // New SDK options - credentials resolved automatically via:
      // - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
      // - IAM roles (EC2, ECS, Lambda)
      // - Shared credentials file (~/.aws/credentials)
      // - Or explicitly provided credentials
      clientConfig = {
        region: providerOptions.region || 'us-east-1',
        ...providerOptions,
      };
    }

    const client = new SESClient(clientConfig);

    return {
      async send(options: SendOptions): Promise<void> {
        const { from, to, cc, bcc, replyTo, subject, text, html } = options;

        const command = new SendEmailCommand({
          Source: from || settings.defaultFrom,
          Destination: {
            ToAddresses: toAddressList(to),
            CcAddresses: toAddressList(cc),
            BccAddresses: toAddressList(bcc),
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Text: text
                ? {
                    Data: text,
                    Charset: 'UTF-8',
                  }
                : undefined,
              Html: html
                ? {
                    Data: html,
                    Charset: 'UTF-8',
                  }
                : undefined,
            },
          },
          ReplyToAddresses: toAddressList(replyTo || settings.defaultReplyTo),
        });

        try {
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
