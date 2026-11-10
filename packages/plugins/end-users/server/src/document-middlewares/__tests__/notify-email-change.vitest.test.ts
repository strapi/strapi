import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { USER_UID } from '../../constants';
import { createTransaction, fakeStrapi } from '../../__tests__/utils/fake-strapi';
import { notifyEmailChangeMiddleware } from '../notify-email-change';

const flush = () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const setup = ({
  stored = { email: 'old@example.com', preferredLocale: 'fr' } as Record<string, unknown> | null,
  sendFails = false,
} = {}) => {
  const sendTemplate = vi.fn(async () => {
    if (sendFails) {
      throw new Error('smtp down');
    }
  });
  const warn = vi.fn();
  const findOne = vi.fn(async () => stored);
  const { transaction, commits } = createTransaction();
  const config: Record<string, unknown> = { 'info.name': 'my-app' };
  const strapi = fakeStrapi({
    db: { transaction, query: () => ({ findOne }) },
    plugin: () => ({ service: () => ({ sendTemplate }) }),
    config: { get: (path: string) => config[path] },
    log: { warn },
  });

  const run = async (email: unknown, written: unknown = { documentId: 'user-1' }) => {
    const ctx = {
      uid: USER_UID,
      action: 'update',
      params: { documentId: 'user-1', data: { email } },
    };
    const next = vi.fn().mockResolvedValue(written);
    const result = await notifyEmailChangeMiddleware(strapi)(ctx as never, next as never);

    await flush();

    return { result, next };
  };

  return { run, sendTemplate, warn, commits };
};

describe('notify-email-change', () => {
  it('sends the notice to the old address once a verified email change completes', async () => {
    const { run, sendTemplate, commits } = setup();
    const { result } = await run('new@example.com');

    expect(result).toEqual({ documentId: 'user-1' });
    expect(commits).toHaveLength(1);
    expect(sendTemplate).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.email-changed',
      'old@example.com',
      { appName: 'my-app', newEmailMasked: 'n***@example.com', changedAt: expect.any(String) },
      { locale: 'fr' }
    );
  });

  it('sends the notice when an admin changes the email in the Content Manager', async () => {
    const { run, sendTemplate } = setup({ stored: { email: 'old@example.com' } });

    // The Content Manager sends whatever was typed: the normalizing rule runs before this one
    await run('  Admin-Set@Example.com ');

    expect(sendTemplate).toHaveBeenCalledWith(
      'end-users.email-changed',
      'old@example.com',
      expect.objectContaining({ newEmailMasked: 'a***@example.com' }),
      { locale: undefined }
    );
  });

  it('sends nothing when the email is unchanged or only its case changed', async () => {
    const { run, sendTemplate } = setup();

    await run('old@example.com');
    await run('OLD@Example.com');

    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it('sends nothing when the write does not name an email, or the user is not there', async () => {
    const { run, sendTemplate } = setup({ stored: null });

    await run(undefined);
    await run('new@example.com', null);

    expect(sendTemplate).not.toHaveBeenCalled();
  });

  it('logs a notice that cannot be sent, and the change goes through', async () => {
    const { run, warn } = setup({ sendFails: true });
    const { result } = await run('new@example.com');

    expect(result).toEqual({ documentId: 'user-1' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('smtp down'));
  });

  it('leaves other content types and other actions alone', async () => {
    const { sendTemplate } = setup();
    const next = vi.fn().mockResolvedValue('result');
    const { strapi } = { strapi: {} as Core.Strapi };

    await notifyEmailChangeMiddleware(strapi)(
      { uid: 'api::a.a', action: 'update', params: { data: { email: 'x@y.z' } } } as never,
      next
    );
    await notifyEmailChangeMiddleware(strapi)(
      { uid: USER_UID, action: 'create', params: { data: { email: 'x@y.z' } } } as never,
      next
    );

    expect(next).toHaveBeenCalledTimes(2);
    expect(sendTemplate).not.toHaveBeenCalled();
  });
});
