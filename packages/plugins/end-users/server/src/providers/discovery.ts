/**
 * The time budget of one OpenID discovery fetch, here when a provider is saved and in the engine
 * when it is rebuilt. Better Auth fetches each generic provider's discovery document when it is
 * built and sets no time limit of its own.
 */
export const DISCOVERY_TIMEOUT_MS = 5000;

/** The longest discovery document read. Real ones are a few kilobytes. */
const MAX_DOCUMENT_BYTES = 1024 * 1024;

/**
 * Why a discovery document is refused. The message is fixed text: what the other server sent is
 * never in it, so it is safe to hand to the client.
 */
export class DiscoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscoveryError';
  }
}

const NOT_REACHED = 'could not be reached';
const NOT_DISCOVERY = 'is not an OpenID discovery document';

/**
 * Fetches the discovery document at `url` and checks that it names an authorization and a token
 * endpoint. Throws `DiscoveryError` otherwise. There is no block on private addresses: a provider
 * on an internal network is a use of this.
 */
export const checkDiscoveryDocument = async (url: string): Promise<void> => {
  let text: string;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }

    text = await response.text();
  } catch {
    throw new DiscoveryError(NOT_REACHED);
  } finally {
    clearTimeout(timer);
  }

  let document: unknown;

  try {
    if (text.length > MAX_DOCUMENT_BYTES) {
      throw new Error('too large');
    }

    document = JSON.parse(text);
  } catch {
    throw new DiscoveryError(NOT_DISCOVERY);
  }

  if (typeof document !== 'object' || document === null || Array.isArray(document)) {
    throw new DiscoveryError(NOT_DISCOVERY);
  }

  const named = (key: string) => {
    const value = (document as Record<string, unknown>)[key];

    return typeof value === 'string' && value !== '';
  };

  if (!named('authorization_endpoint')) {
    throw new DiscoveryError('names no authorization endpoint');
  }

  if (!named('token_endpoint')) {
    throw new DiscoveryError('names no token endpoint');
  }
};
