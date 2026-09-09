import { ConflictError } from '../errors';

describe('ConflictError', () => {
  it('uses the default message and empty details', () => {
    expect(new ConflictError()).toMatchObject({
      name: 'ConflictError',
      message: 'Conflict',
      details: {},
    });
  });

  it('keeps a custom message and details', () => {
    expect(new ConflictError('Stale document', { expected: 'old', current: 'new' })).toMatchObject({
      name: 'ConflictError',
      message: 'Stale document',
      details: { expected: 'old', current: 'new' },
    });
  });
});
