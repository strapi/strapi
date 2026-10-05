import { adminApi } from '@strapi/admin/strapi-admin';
import { renderHook, act, waitFor } from '@tests/utils';

import { useTypedSelector } from '../../store/hooks';
import { uploadProgressReducer } from '../../store/uploadProgress';
import { useUploadFromUrlsMutation } from '../api';

/**
 * The URL flow never touches XHR: the server fetches the remote file and reports its
 * progress back as SSE frames. These cover how `file:progress` lands on a row — the
 * only byte progress the flow ever gets.
 */

// The harness store has no `uploadProgress` slice (the plugin registers it via
// `app.addReducers` at runtime), and overriding `reducer` replaces the whole map.
const storeConfig = {
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
    admin_app: (state = { token: 'test-token' }) => state,
    uploadProgress: uploadProgressReducer,
  },
};

type Frame = [event: string, data: unknown];

/**
 * A stand-in for `response.body`: `processSSEStream` only ever takes a reader and pulls
 * chunks off it, so the frames are handed over one `read()` at a time.
 */
const sseBody = (frames: Frame[]) => {
  const encoder = new TextEncoder();
  const chunks = frames.map(([event, data]) =>
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  );

  let cursor = 0;

  return {
    getReader: () => ({
      read: async () =>
        cursor < chunks.length
          ? { done: false, value: chunks[cursor++] }
          : { done: true, value: undefined },
    }),
  };
};

const setup = (frames: Frame[]) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, body: sseBody(frames) }) as never;

  const { result } = renderHook(
    () => ({
      upload: useUploadFromUrlsMutation(),
      files: useTypedSelector((state) => state.uploadProgress.files),
    }),
    { providerOptions: { storeConfig } }
  );

  act(() => {
    result.current.upload[0]({
      urls: ['https://example.com/big.zip'],
      folderId: null,
      generateAiMetadata: false,
    });
  });

  return result;
};

describe('file:progress on a URL upload', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sizes the row and climbs its byte count', async () => {
    const result = setup([
      ['file:fetching', { url: 'https://example.com/big.zip', index: 0, total: 1 }],
      ['file:progress', { index: 0, loadedBytes: 0, totalBytes: 1000, phase: 'fetch' }],
      ['file:progress', { index: 0, loadedBytes: 400, totalBytes: 1000, phase: 'fetch' }],
      ['stream:complete', { data: [], errors: [] }],
    ]);

    await waitFor(() => expect(result.current.files[0].uploadedBytes).toBe(400));
    // The row is created with `size: 0`; without the size riding along on the progress
    // event the bytes would be clamped straight back down to zero.
    expect(result.current.files[0].size).toBe(1000);
  });

  // A chunked remote sends no Content-Length, so there is no denominator. The row must
  // stay indeterminate rather than show an invented percentage.
  it('reports nothing when the total is unknown', async () => {
    const result = setup([
      ['file:fetching', { url: 'https://example.com/big.zip', index: 0, total: 1 }],
      ['file:progress', { index: 0, loadedBytes: 0, totalBytes: null, phase: 'fetch' }],
      ['file:progress', { index: 0, loadedBytes: 400, totalBytes: null, phase: 'fetch' }],
      ['stream:complete', { data: [], errors: [] }],
    ]);

    await waitFor(() => expect(result.current.files).toHaveLength(1));
    expect(result.current.files[0].size).toBe(0);
    expect(result.current.files[0].uploadedBytes).toBe(0);
  });
});
