import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import templateController from '../template';

const createCtx = (overrides: Record<string, unknown> = {}) =>
  ({
    params: { key: 'end-users.reset-password' },
    query: { locale: 'fr' },
    request: { body: { subject: 'S', html: '<p>{{ url }}</p>', text: '{{ url }}' } },
    state: { user: { id: 7 } },
    ...overrides,
  }) as any;

describe('Template controller', () => {
  const templates = { update: vi.fn(), reset: vi.fn() };
  const info = vi.fn();

  beforeEach(() => {
    templates.update.mockResolvedValue({ key: 'end-users.reset-password' });
    templates.reset.mockResolvedValue(undefined);
    vi.stubGlobal('strapi', {
      log: { info },
      plugin: () => ({ service: () => templates }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('logs each save and reset with the admin id', async () => {
    await templateController.update(createCtx());
    await templateController.reset(createCtx());

    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenNthCalledWith(
      1,
      'Email template "end-users.reset-password" (fr) was saved by admin user 7'
    );
    expect(info).toHaveBeenNthCalledWith(
      2,
      'Email template "end-users.reset-password" (fr) was reset by admin user 7'
    );
  });

  it('does not log a save the service refused', async () => {
    templates.update.mockRejectedValue(new Error('refused'));

    await expect(templateController.update(createCtx())).rejects.toThrow('refused');

    expect(info).not.toHaveBeenCalled();
  });
});
