import type { Core } from '@strapi/types';

import { RELEASE_MODEL_UID } from '../../constants';
import { freezeReleasesFailedBeforeUpgrade } from '..';

describe('freezeReleasesFailedBeforeUpgrade', () => {
  it('freezes the failed releases that never got a releasedAt, and only them', async () => {
    const updateMany = jest.fn();
    const query = jest.fn(() => ({ updateMany }));
    const strapi = { db: { query } } as unknown as Core.Strapi;

    await freezeReleasesFailedBeforeUpgrade({ strapi });

    expect(query).toHaveBeenCalledWith(RELEASE_MODEL_UID);
    expect(updateMany.mock.calls).toStrictEqual([
      [
        {
          where: { status: 'failed', releasedAt: null },
          data: { releasedAt: expect.any(Date), failureReason: 'failed_before_upgrade' },
        },
      ],
    ]);
  });

  it('logs a failure instead of stopping the startup', async () => {
    const error = new Error('write failed');
    const logError = jest.fn();
    const strapi = {
      db: { query: () => ({ updateMany: jest.fn().mockRejectedValue(error) }) },
      log: { error: logError },
    } as unknown as Core.Strapi;

    await expect(freezeReleasesFailedBeforeUpgrade({ strapi })).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledWith(
      'Error while freezing releases that failed before the upgrade',
      { error }
    );
  });
});
