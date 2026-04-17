import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
  type SESClientConfig,
} from '@aws-sdk/client-ses';

interface Settings {
  defaultFrom: string;
  defaultReplyTo: string | string[];
}

interface SendOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  [key: string]: unknown;
}

interface ProviderCredentials {
  key: string;
  secret: string;
  sessionToken?: string;
}

interface ProviderOptions extends Omit<SESClientConfig, 'credentials'> {
  credentials?: ProviderCredentials | NonNullable<SESClientConfig['credentials']>;
  key?: string;
  secret?: string;
  amazon?: string;
}

const toAddressList = (value?: string | string[]): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const getClientConfig = (providerOptions: ProviderOptions): SESClientConfig => {
  const { key, secret, amazon, credentials, ...clientConfig } = providerOptions;

  const endpoint = amazon || providerOptions.endpoint;

  const explicitCredentials =
    (credentials && typeof credentials === 'object' && 'key' in credentials
      ? {
          accessKeyId: credentials.key,
          secretAccessKey: credentials.secret,
          ...(credentials.sessionToken ? { sessionToken: credentials.sessionToken } : {}),
        }
      : credentials) ||
    (key && secret
      ? {
          accessKeyId: key,
          secretAccessKey: secret,
        }
      : undefined);

  return {
    ...clientConfig,
    ...(endpoint ? { endpoint } : {}),
    ...(explicitCredentials
      ? {
          credentials: explicitCredentials,
        }
      : {}),
  };
};

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const client = new SESClient(getClientConfig(providerOptions));

    return {
      async send(options: SendOptions): Promise<void> {
        const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

        const commandInput: SendEmailCommandInput = {
          Source: from || settings.defaultFrom,
          Destination: {
            ToAddresses: toAddressList(to),
            CcAddresses: toAddressList(cc),
            BccAddresses: toAddressList(bcc),
          },
          ReplyToAddresses: toAddressList(replyTo || settings.defaultReplyTo),
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              ...(html
                ? {
                    Html: {
                      Data: html,
                      Charset: 'UTF-8',
                    },
                  }
                : {}),
              ...(text
                ? {
                    Text: {
                      Data: text,
                      Charset: 'UTF-8',
                    },
                  }
                : {}),
            },
          },
          ...rest,
        };

        await client.send(new SendEmailCommand(commandInput));
      },
    };
  },
};
