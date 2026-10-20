import { setImmediate } from 'node:timers/promises';

import type { Core } from '@strapi/types';

import { addReasonsToInvalidActions } from '..';

const revalidatePlannedActions = jest.fn();
const logError = jest.fn();

const strapi = {
  plugin: () => ({ service: () => ({ revalidatePlannedActions }) }),
  log: { error: logError },
} as unknown as Core.Strapi;

describe('addReasonsToInvalidActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    revalidatePlannedActions.mockResolvedValue(undefined);
  });

  it('logs a failure instead of leaving an unhandled rejection', async () => {
    revalidatePlannedActions.mockRejectedValue(new Error('revalidation failed'));

    await addReasonsToInvalidActions({ strapi });
    // Not awaited by startup: let it settle
    await setImmediate();

    expect(logError).toHaveBeenCalledWith(
      'Error while adding reasons to release actions that are not publishable',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
