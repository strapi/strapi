import { createServer } from 'node:http';

// Must match the byok config in tests/app-template/config/plugins.js.
export const BYOK_MOCK_PROVIDER_PORT = 8900;
export const BYOK_TRANSLATIONS_MODEL = 'e2e-translations-model';
export const BYOK_CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

export interface ByokMockProviderRequest {
  path: string;
  model: unknown;
}

export interface ByokMockProvider {
  receivedRequests: ByokMockProviderRequest[];
  close: () => Promise<void>;
}

const readModelName = (requestBody: Buffer): unknown => {
  try {
    return JSON.parse(requestBody.toString()).model;
  } catch {
    return undefined;
  }
};

/**
 * An OpenAI-compatible provider that answers every chat completion with `replyContent`.
 *
 * The request body holds the prompts of the private `@strapi-enterprise/ai-workflows` package.
 * Never log, store, return, or compare it: only the path and the model name leave this server.
 */
export const startByokMockProvider = async (replyContent: unknown): Promise<ByokMockProvider> => {
  const receivedRequests: ByokMockProviderRequest[] = [];

  const server = createServer((request, response) => {
    const requestBodyChunks: Buffer[] = [];

    request.on('data', (chunk: Buffer) => requestBodyChunks.push(chunk));
    request.on('end', () => {
      const path = request.url ?? '';
      receivedRequests.push({ path, model: readModelName(Buffer.concat(requestBodyChunks)) });

      if (request.method !== 'POST' || path !== BYOK_CHAT_COMPLETIONS_PATH) {
        response.writeHead(404).end();
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              finish_reason: 'stop',
              message: { role: 'assistant', content: JSON.stringify(replyContent) },
            },
          ],
        })
      );
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(BYOK_MOCK_PROVIDER_PORT, '127.0.0.1', resolve);
  });

  return {
    receivedRequests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
