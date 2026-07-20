import { attemptTokenRefresh } from '@strapi/admin/strapi-admin';

import { uploadFileViaXHR, UploadAbortedError, UploadFileError } from '../uploadFileViaXHR';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  attemptTokenRefresh: jest.fn(),
}));

const attemptTokenRefreshMock = jest.mocked(attemptTokenRefresh);

interface ProgressLike {
  loaded: number;
  total: number;
  lengthComputable: boolean;
}

class MockXHR {
  static instances: MockXHR[] = [];

  method = '';
  url = '';
  headers: Record<string, string> = {};
  responseText = '';
  status = 0;
  sent: unknown = null;
  aborted = false;

  upload: { onprogress: ((event: ProgressLike) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    MockXHR.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }

  setRequestHeader(key: string, value: string) {
    this.headers[key] = value;
  }

  send(body: unknown) {
    this.sent = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.();
  }

  // --- test helpers ---
  emitProgress(loaded: number, total: number, lengthComputable = true) {
    this.upload.onprogress?.({ loaded, total, lengthComputable });
  }

  respond(status: number, body: string) {
    this.status = status;
    this.responseText = body;
    this.onload?.();
  }

  fail() {
    this.onerror?.();
  }
}

const ENDPOINT = 'http://localhost:1337/upload/unstable/upload-file';

describe('uploadFileViaXHR', () => {
  let OriginalXHR: typeof XMLHttpRequest;

  beforeEach(() => {
    MockXHR.instances = [];
    attemptTokenRefreshMock.mockReset();
    OriginalXHR = global.XMLHttpRequest;
    // Stub the global so the function under test uses our controllable fake.
    global.XMLHttpRequest = MockXHR as unknown as typeof XMLHttpRequest;
  });

  afterEach(() => {
    global.XMLHttpRequest = OriginalXHR;
  });

  const lastXHR = () => MockXHR.instances[MockXHR.instances.length - 1];

  it('resolves with the parsed File on a 2xx response', async () => {
    const file = { id: 1, name: 'photo.png', hash: 'abc' };
    const controller = new AbortController();

    const promise = uploadFileViaXHR(ENDPOINT, 'token', new FormData(), controller.signal);
    lastXHR().respond(201, JSON.stringify(file));

    await expect(promise).resolves.toEqual(file);
  });

  it('rejects with a typed UploadFileError on a non-2xx response', async () => {
    const controller = new AbortController();

    const promise = uploadFileViaXHR(ENDPOINT, 'token', new FormData(), controller.signal);
    lastXHR().respond(400, JSON.stringify({ error: { message: 'File too large' } }));

    await expect(promise).rejects.toMatchObject({
      name: 'UploadFileError',
      message: 'File too large',
      status: 400,
    });
    await expect(promise).rejects.toBeInstanceOf(UploadFileError);
  });

  it('refreshes the access token and retries once on a 401 response', async () => {
    const controller = new AbortController();
    const formData = new FormData();
    attemptTokenRefreshMock.mockResolvedValue('refreshed-token');

    const promise = uploadFileViaXHR(ENDPOINT, 'expired-token', formData, controller.signal);
    lastXHR().respond(401, JSON.stringify({ error: { message: 'Unauthorized' } }));

    await Promise.resolve();
    await Promise.resolve();

    expect(attemptTokenRefreshMock).toHaveBeenCalledTimes(1);
    expect(MockXHR.instances).toHaveLength(2);
    expect(lastXHR().headers.Authorization).toBe('Bearer refreshed-token');
    expect(lastXHR().sent).toBe(formData);

    const file = { id: 1, name: 'photo.png', hash: 'abc' };
    lastXHR().respond(201, JSON.stringify(file));

    await expect(promise).resolves.toEqual(file);
  });

  it('returns the original 401 error when refreshing the access token fails', async () => {
    const controller = new AbortController();
    attemptTokenRefreshMock.mockRejectedValue(new Error('Refresh failed'));

    const promise = uploadFileViaXHR(ENDPOINT, 'expired-token', new FormData(), controller.signal);
    lastXHR().respond(401, JSON.stringify({ error: { message: 'Unauthorized' } }));

    await expect(promise).rejects.toMatchObject({
      name: 'UploadFileError',
      message: 'Unauthorized',
      status: 401,
    });
    expect(MockXHR.instances).toHaveLength(1);
  });

  it('rejects with an UploadAbortedError when the signal aborts mid-flight', async () => {
    const controller = new AbortController();

    const promise = uploadFileViaXHR(ENDPOINT, 'token', new FormData(), controller.signal);
    controller.abort();

    await expect(promise).rejects.toBeInstanceOf(UploadAbortedError);
    expect(lastXHR().aborted).toBe(true);
  });

  it('rejects immediately with an UploadAbortedError when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    const promise = uploadFileViaXHR(ENDPOINT, 'token', new FormData(), controller.signal);

    await expect(promise).rejects.toBeInstanceOf(UploadAbortedError);
    // No request should have been opened.
    expect(MockXHR.instances).toHaveLength(0);
  });

  it('rejects with an UploadFileError on a network error', async () => {
    const controller = new AbortController();

    const promise = uploadFileViaXHR(ENDPOINT, 'token', new FormData(), controller.signal);
    lastXHR().fail();

    await expect(promise).rejects.toBeInstanceOf(UploadFileError);
  });

  it('forwards bytes/total from upload progress events to onProgress', async () => {
    const controller = new AbortController();
    const onProgress = jest.fn();

    const promise = uploadFileViaXHR(
      ENDPOINT,
      'token',
      new FormData(),
      controller.signal,
      onProgress
    );

    lastXHR().emitProgress(256, 1024);
    lastXHR().emitProgress(512, 1024);

    expect(onProgress).toHaveBeenNthCalledWith(1, 256, 1024);
    expect(onProgress).toHaveBeenNthCalledWith(2, 512, 1024);

    lastXHR().respond(201, JSON.stringify({ id: 1 }));
    await promise;
  });

  it('ignores non-length-computable progress events', async () => {
    const controller = new AbortController();
    const onProgress = jest.fn();

    const promise = uploadFileViaXHR(
      ENDPOINT,
      'token',
      new FormData(),
      controller.signal,
      onProgress
    );

    lastXHR().emitProgress(256, 0, false);

    expect(onProgress).not.toHaveBeenCalled();

    lastXHR().respond(201, JSON.stringify({ id: 1 }));
    await promise;
  });

  it('sets the Authorization header only when a token is provided', async () => {
    const controller = new AbortController();

    const withToken = uploadFileViaXHR(ENDPOINT, 'my-token', new FormData(), controller.signal);
    expect(lastXHR().headers.Authorization).toBe('Bearer my-token');
    lastXHR().respond(201, '{}');
    await withToken;

    const withoutToken = uploadFileViaXHR(ENDPOINT, null, new FormData(), controller.signal);
    expect(lastXHR().headers.Authorization).toBeUndefined();
    lastXHR().respond(201, '{}');
    await withoutToken;
  });
});
