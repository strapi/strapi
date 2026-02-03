import { type SESClientConfig, SendEmailCommand, SESClient } from '@aws-sdk/client-ses';
import { ProviderOptions, LegacyProviderOptions } from './models/provider-options';
import { SendOptions } from './models/send-options';
import { Settings } from './models/settings';

// Helper to check if using legacy options
function isLegacyOptions(options: ProviderOptions): options is LegacyProviderOptions {
  return 'key' in options && 'secret' in options;
}

// Extract region from legacy amazon URL
function extractRegionFromUrl(amazonUrl: string): string | undefined {
  const match = amazonUrl.match(/email\.([a-z0-9-]+)\.amazonaws\.com/);
  return match?.[1];
}

// Convert to array for SES API
function toAddressList(value: string | string[] | undefined): string[] | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value : [value];
}

function createClientConfigFromOptions(providerOptions: ProviderOptions): SESClientConfig {
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

  return clientConfig;
}

function createSendEmailCommand(sendOptions: SendOptions, settings: Settings): SendEmailCommand {
  const { from, to, cc, bcc, replyTo, subject, text, html } = sendOptions;

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

  return command;
}

function createSesClientFromProviderOptions(providerOptions: ProviderOptions): SESClient {
  const clientConfig = createClientConfigFromOptions(providerOptions);
  const client = new SESClient(clientConfig);
  return client;
}

export { createSendEmailCommand, createSesClientFromProviderOptions };
