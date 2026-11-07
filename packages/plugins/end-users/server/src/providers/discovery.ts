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

/** Thrown inside the fetch when the document is over the size cap. */
class TooLarge extends Error {}

/**
 * Reads the body as text, giving up as soon as more than `MAX_DOCUMENT_BYTES` have arrived. The
 * fetch is aborted at that point, so a huge response is never held in memory whole.
 */
const readLimited = async (response: Response, controller: AbortController): Promise<string> => {
  const declared = response.headers.get('content-length');

  if (declared !== null && Number(declared) > MAX_DOCUMENT_BYTES) {
    controller.abort();
    throw new TooLarge();
  }

  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > MAX_DOCUMENT_BYTES) {
      controller.abort();
      throw new TooLarge();
    }

    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
};

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

    text = await readLimited(response, controller);
  } catch (error) {
    throw new DiscoveryError(error instanceof TooLarge ? NOT_DISCOVERY : NOT_REACHED);
  } finally {
    clearTimeout(timer);
  }

  let document: unknown;

  try {
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
