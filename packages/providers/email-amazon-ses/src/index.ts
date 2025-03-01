import { SESClient, SESClientConfig, SendEmailCommand } from '@aws-sdk/client-ses';

interface Settings {
  defaultFrom: string;
  defaultReplyTo: string;
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

/**
 * For backward compatibility with node-ses provider options
 */
interface LegacyProviderOptions {
  key: string;
  secret: string;
  amazon?: string;
}

type ProviderOptions = LegacyProviderOptions | SESClientConfig;

const asArray = (value: string | string[]) => (Array.isArray(value) ? value : [value]);
const getConfig = (config: ProviderOptions): SESClientConfig => {
  const isLegacyConfig = (config: ProviderOptions): config is LegacyProviderOptions =>
    'secret' in config;

  if (!isLegacyConfig(config)) {
    return config;
  }
  return {
    credentials: {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
    },
    // extract region from https://email.<region>.amazonaws.com
    region: config.amazon?.split('.')[1] ?? 'us-east-1',
  };
};

export default {
  init(providerOptions: ProviderOptions, settings: Settings) {
    const client = new SESClient(getConfig(providerOptions));

    return {
      async send(options: SendOptions): Promise<void> {
        try {
          const {
            from = settings.defaultFrom,
            to,
            cc,
            bcc,
            replyTo = settings.defaultReplyTo,
            subject,
            text,
            html,
          } = options;

          const emailCommand = new SendEmailCommand({
            Source: from,
            Destination: {
              ToAddresses: asArray(to),
              CcAddresses: cc ? asArray(cc) : undefined,
              BccAddresses: bcc ? asArray(bcc) : undefined,
            },
            Message: {
              Subject: { Data: subject },
              Body: {
                Text: { Data: text },
                Html: { Data: html },
              },
            },
            ReplyToAddresses: replyTo ? [replyTo || from] : undefined,
          });

          await client.send(emailCommand);
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(`AWS SES Error: ${error.message}`);
          }
          throw error;
        }
      },
    };
  },
};
