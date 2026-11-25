import type { SendEmailCommandInput, SESClientConfig } from '@aws-sdk/client-ses';

/** Default SES API host when `amazon` is omitted (same as legacy node-ses). */
export const DEFAULT_SES_ENDPOINT = 'https://email.us-east-1.amazonaws.com';

export const SES_ENDPOINT_REGION_PATTERN = /email\.([a-z0-9-]+)\.amazonaws\.com/i;

export interface ProviderCredentials {
  key: string;
  secret: string;
  sessionToken?: string;
}

export interface ProviderOptions extends Omit<SESClientConfig, 'credentials'> {
  credentials?: ProviderCredentials | NonNullable<SESClientConfig['credentials']>;
  key?: string;
  secret?: string;
  amazon?: string;
}

export interface ProviderSettings {
  defaultFrom: string;
  defaultReplyTo: string | string[];
}

export interface SendOptions {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  subject: string;
  text: string;
  html: string;
  [key: string]: unknown;
}

type EndpointInput = string | SESClientConfig['endpoint'];

const resolveEndpointUrl = (endpoint?: EndpointInput): string | undefined => {
  if (!endpoint) {
    return undefined;
  }

  if (typeof endpoint === 'string') {
    return endpoint;
  }

  if (typeof endpoint === 'object' && 'url' in endpoint && typeof endpoint.url === 'string') {
    return endpoint.url;
  }

  return undefined;
};

export const regionFromEndpoint = (endpoint?: EndpointInput): string | undefined => {
  const endpointUrl = resolveEndpointUrl(endpoint);

  if (!endpointUrl) {
    return undefined;
  }

  try {
    const match = new URL(endpointUrl).hostname.match(SES_ENDPOINT_REGION_PATTERN);
    return match?.[1];
  } catch {
    return undefined;
  }
};

/** Matches node-ses `extractRecipient`: arrays pass through, strings become a single entry. */
export const toAddressList = (value?: string | string[]): string[] | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
};

export interface LegacyMessageTag {
  name: string;
  value: string;
}

const mapLegacyMessageTags = (messageTags: unknown): SendEmailCommandInput['Tags'] => {
  if (!Array.isArray(messageTags)) {
    return undefined;
  }

  return messageTags
    .filter(
      (tag): tag is LegacyMessageTag =>
        typeof tag === 'object' &&
        tag !== null &&
        'name' in tag &&
        'value' in tag &&
        typeof tag.name === 'string' &&
        typeof tag.value === 'string'
    )
    .map((tag) => ({
      Name: tag.name,
      Value: tag.value,
    }));
};

/**
 * Maps legacy node-ses `providerOptions` and AWS SDK v3 `SESClient` config.
 *
 * Rewrites:
 * - `key` / `secret` → `credentials.accessKeyId` / `credentials.secretAccessKey`
 * - `credentials: { key, secret }` → AWS credential object
 * - `amazon` → `endpoint`
 * - region from `amazon` / `endpoint` host (`email.<region>.amazonaws.com`)
 * - `key` + `secret` only → `region: us-east-1` (node-ses default endpoint behavior)
 */
export const getClientConfig = (providerOptions: ProviderOptions): SESClientConfig => {
  const { key, secret, amazon, credentials, region, ...clientConfig } = providerOptions;

  const hasLegacyStaticCredentials = Boolean(key && secret);
  const endpoint =
    amazon ||
    providerOptions.endpoint ||
    (hasLegacyStaticCredentials ? DEFAULT_SES_ENDPOINT : undefined);

  const parsedRegionFromEndpoint = regionFromEndpoint(endpoint);

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

  const unparseableLegacyAmazon = Boolean(
    amazon && hasLegacyStaticCredentials && !parsedRegionFromEndpoint
  );

  const resolvedRegion =
    region ||
    parsedRegionFromEndpoint ||
    ((unparseableLegacyAmazon ||
      (hasLegacyStaticCredentials && !parsedRegionFromEndpoint && !endpoint)) &&
      'us-east-1') ||
    undefined;

  // node-ses createClient only consumed key, secret, and amazon — ignore stray options.
  const sdkOnlyOptions = hasLegacyStaticCredentials ? {} : clientConfig;

  return {
    ...sdkOnlyOptions,
    ...(resolvedRegion ? { region: resolvedRegion } : {}),
    ...(endpoint ? { endpoint } : {}),
    ...(explicitCredentials
      ? {
          credentials: explicitCredentials,
        }
      : {}),
  };
};

/** Builds SendEmail input (html → Html body, text → Text body; legacy node-ses message/altText). */
export const buildSendEmailCommandInput = (
  options: SendOptions,
  settings: ProviderSettings
): SendEmailCommandInput => {
  const { from, to, cc, bcc, replyTo, subject, text, html, ...rest } = options;

  const { configurationSet, messageTags, ...sdkRest } = rest;

  const commandInput: SendEmailCommandInput = {
    Source: from || settings.defaultFrom,
    Destination: {
      ToAddresses: toAddressList(to),
      CcAddresses: toAddressList(cc),
      BccAddresses: toAddressList(bcc),
    },
    ReplyToAddresses: toAddressList(replyTo !== undefined ? replyTo : settings.defaultReplyTo),
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
    ...sdkRest,
  };

  if (typeof configurationSet === 'string') {
    commandInput.ConfigurationSetName = configurationSet;
  }

  const tags = mapLegacyMessageTags(messageTags);

  if (tags?.length) {
    commandInput.Tags = tags;
  }

  return commandInput;
};
