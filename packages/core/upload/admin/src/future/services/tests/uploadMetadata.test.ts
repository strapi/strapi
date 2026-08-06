import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { maybeGenerateMetadata, uploadApi, useGenerateAiMetadataMutation } from '../api';

import type {
  File as UploadedFile,
  UnstableGenerateAIMetadata,
} from '../../../../../shared/contracts/files';

const makeUploadedFile = (id: number, mime: string): UploadedFile =>
  ({ id, name: `file-${id}`, mime }) as UploadedFile;

const UPLOAD_ID = 7;

/**
 * Calls the shared metadata helper with a stubbed dispatch.
 *
 * The helper dispatches plain actions plus one RTK Query thunk (from
 * `endpoint.initiate`). The thunk is intercepted rather than executed so no request
 * is made; `result` decides how the endpoint's promise settles.
 */
const runHelper = async ({
  file,
  enabled = true,
  result,
}: {
  file: UploadedFile;
  enabled?: boolean;
  result?: { data: UnstableGenerateAIMetadata.Response['data'] } | { error: Error };
}) => {
  const actions: Array<{ type: string; payload?: unknown }> = [];
  let didInitiate = false;
  let chain: Promise<unknown> = Promise.resolve();

  const dispatch = jest.fn((action: unknown) => {
    // `initiate()` returns a thunk (a function); everything else is a plain action.
    if (typeof action === 'function') {
      didInitiate = true;

      return {
        unwrap: () => {
          const promise =
            result && 'error' in result
              ? Promise.reject(result.error)
              : Promise.resolve(result?.data ?? []);
          // Retain the follow-up chain so the test can await the resulting dispatch.
          chain = promise.then(
            () => {},
            () => {}
          );
          return promise;
        },
      };
    }

    actions.push(action as { type: string; payload?: unknown });
    return action;
  });

  maybeGenerateMetadata({
    file,
    index: 0,
    uploadId: UPLOAD_ID,
    enabled,
    dispatch: dispatch as never,
  });

  // Let the fire-and-forget promise chain settle.
  await chain;
  await Promise.resolve();

  return { actions, didInitiate, dispatch };
};

const typesOf = (actions: Array<{ type: string }>) => actions.map((a) => a.type);

const payloadOf = (actions: Array<{ type: string; payload?: unknown }>, type: string) =>
  actions.find((a) => a.type === type)?.payload;

describe('maybeGenerateMetadata', () => {
  it('requests generation for an uploaded image and marks the row generating', async () => {
    const { actions, didInitiate } = await runHelper({
      file: makeUploadedFile(42, 'image/png'),
      result: { data: [{ id: 42, status: 'success' }] },
    });

    expect(didInitiate).toBe(true);
    expect(typesOf(actions)).toContain('uploadProgress/setFileMetadataGenerating');
  });

  it('also sends non-image files and lets the server classify them as skipped', async () => {
    const { actions, didInitiate } = await runHelper({
      file: makeUploadedFile(43, 'application/pdf'),
      result: { data: [{ id: 43, status: 'skipped' }] },
    });

    // The mime rule lives server-side only, so a PDF gets a real skipped state.
    expect(didInitiate).toBe(true);
    expect(payloadOf(actions, 'uploadProgress/setFileMetadataResult')).toMatchObject({
      status: 'skipped',
    });
  });

  it('sends a file with no mime rather than guessing client-side', async () => {
    const { didInitiate } = await runHelper({
      file: { id: 45, name: 'mystery' } as UploadedFile,
      result: { data: [{ id: 45, status: 'skipped' }] },
    });

    expect(didInitiate).toBe(true);
  });

  it('does nothing when AI metadata is disabled', async () => {
    const { actions, didInitiate } = await runHelper({
      file: makeUploadedFile(44, 'image/jpeg'),
      enabled: false,
    });

    expect(didInitiate).toBe(false);
    expect(actions).toEqual([]);
  });

  it.each([
    ['success', 'generated'],
    ['skipped', 'skipped'],
    ['error', 'failed'],
  ] as const)('maps a server "%s" result to "%s"', async (serverStatus, expected) => {
    const { actions } = await runHelper({
      file: makeUploadedFile(50, 'image/png'),
      result: { data: [{ id: 50, status: serverStatus }] },
    });

    expect(payloadOf(actions, 'uploadProgress/setFileMetadataResult')).toEqual({
      index: 0,
      uploadId: UPLOAD_ID,
      status: expected,
    });
  });

  it('picks the result matching the file id when several are returned', async () => {
    const { actions } = await runHelper({
      file: makeUploadedFile(60, 'image/png'),
      result: {
        data: [
          { id: 59, status: 'error' },
          { id: 60, status: 'success' },
        ],
      },
    });

    expect(payloadOf(actions, 'uploadProgress/setFileMetadataResult')).toMatchObject({
      status: 'generated',
    });
  });

  it('marks the row failed when the request rejects, and never rethrows', async () => {
    const { actions } = await runHelper({
      file: makeUploadedFile(51, 'image/png'),
      result: { error: new Error('network down') },
    });

    expect(payloadOf(actions, 'uploadProgress/setFileMetadataResult')).toMatchObject({
      status: 'failed',
    });
    // The upload already succeeded — the row's upload status is never touched.
    expect(typesOf(actions)).not.toContain('uploadProgress/setFileError');
    expect(typesOf(actions)).not.toContain('uploadProgress/setUploadFailed');
  });

  it('marks the row failed when the response carries no result for the file', async () => {
    const { actions } = await runHelper({
      file: makeUploadedFile(52, 'image/png'),
      result: { data: [] },
    });

    expect(payloadOf(actions, 'uploadProgress/setFileMetadataResult')).toMatchObject({
      status: 'failed',
    });
  });

  it('carries the batch uploadId on every dispatch so stale callbacks can be dropped', async () => {
    const { actions } = await runHelper({
      file: makeUploadedFile(53, 'image/webp'),
      result: { data: [{ id: 53, status: 'success' }] },
    });

    expect(payloadOf(actions, 'uploadProgress/setFileMetadataGenerating')).toMatchObject({
      uploadId: UPLOAD_ID,
    });
    expect(payloadOf(actions, 'uploadProgress/setFileMetadataResult')).toMatchObject({
      uploadId: UPLOAD_ID,
    });
  });
});

describe('generateAiMetadata endpoint', () => {
  it('lives on uploadApi so the upload flows can initiate it without a circular import', () => {
    // `assets.ts` imports from `api.ts`, so the endpoint the upload loop dispatches
    // has to be defined here — `assets.ts` only re-exports the hook.
    expect(uploadApi.endpoints.generateAiMetadata).toBeDefined();
    expect(uploadApi.endpoints.generateAiMetadata.initiate).toBeInstanceOf(Function);
  });

  it('posts a single-element fileIds array for one completed file', async () => {
    let body: { fileIds?: number[] } | undefined;
    server.use(
      http.post('*/upload/unstable/generate-ai-metadata', async ({ request }) => {
        body = (await request.json()) as { fileIds?: number[] };
        return HttpResponse.json({ data: [{ id: 42, status: 'success' }] });
      })
    );

    const { result } = renderHook(() => useGenerateAiMetadataMutation());
    const [generateAiMetadata] = result.current;
    // The upload flows always call it per completed file, never batched.
    await generateAiMetadata({ fileIds: [42] });

    await waitFor(() => expect(result.current[1].isSuccess).toBe(true));

    expect(body).toEqual({ fileIds: [42] });
    expect(result.current[1].data).toEqual([{ id: 42, status: 'success' }]);
  });
});
