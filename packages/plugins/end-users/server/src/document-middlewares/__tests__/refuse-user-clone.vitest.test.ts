import { errors } from '@strapi/utils';
import { describe, expect, it, vi } from 'vitest';

import { USER_UID } from '../../constants';
import { refuseUserCloneMiddleware } from '../refuse-user-clone';

const run = (ctx: Record<string, unknown>) => {
  const next = vi.fn().mockResolvedValue('result');

  return { next, result: refuseUserCloneMiddleware(ctx as never, next) };
};

describe('refuse-user-clone', () => {
  it('refuses a clone of a user with a validation error, and writes nothing', async () => {
    const { next, result } = run({ uid: USER_UID, action: 'clone', params: { documentId: 'u1' } });

    await expect(result).rejects.toBeInstanceOf(errors.ValidationError);
    await expect(result).rejects.toThrow('Users cannot be cloned');
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['create', 'update', 'delete', 'findOne', 'publish'])(
    'lets %s of a user through',
    async (action) => {
      const { next, result } = run({ uid: USER_UID, action });

      await expect(result).resolves.toBe('result');
      expect(next).toHaveBeenCalledTimes(1);
    }
  );

  it('lets a clone of any other content type through', async () => {
    const { next, result } = run({ uid: 'api::note.note', action: 'clone' });

    await expect(result).resolves.toBe('result');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
