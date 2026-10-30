import { setImmediate as nodeSetImmediate } from 'timers';

import type { Context } from 'koa';

import schemaController from '../schema';

const mockValidateUpdateSchema = jest.fn();
const mockUpdateSchema = jest.fn();

jest.mock('../validation/schema', () => ({
  validateUpdateSchema: (...args: unknown[]) => mockValidateUpdateSchema(...args),
}));

jest.mock('../../utils', () => ({
  getService: () => ({
    updateSchema: (...args: unknown[]) => mockUpdateSchema(...args),
  }),
}));

const updateBody = {
  data: {
    contentTypes: [{ action: 'create' }],
    components: [],
  },
};

const createCtx = () => {
  const conflict = jest.fn();
  const ctx = {
    request: { body: updateBody },
    conflict,
    send: jest.fn(),
  } as unknown as Context;

  return { ctx, conflict };
};

describe('Schema controller', () => {
  beforeEach(() => {
    // The controller schedules the reload with setImmediate. jsdom does not provide it.
    Object.assign(global, { setImmediate: nodeSetImmediate });
    mockValidateUpdateSchema.mockReset();
    mockUpdateSchema.mockReset();
    mockUpdateSchema.mockResolvedValue(undefined);
    global.strapi = {
      reload: Object.assign(jest.fn(), { isWatching: true, isReloading: false }),
    } as unknown as typeof global.strapi;
  });

  test('claims the update lock before validation so a second request conflicts', async () => {
    let releaseValidation: (value: typeof updateBody) => void = () => {};
    mockValidateUpdateSchema.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseValidation = resolve;
        })
    );

    const controller = schemaController();
    const first = createCtx();
    const second = createCtx();

    const pending = controller.updateSchema(first.ctx);
    await controller.updateSchema(second.ctx);

    expect(second.conflict).toHaveBeenCalledWith('Schema update is already in progress.');
    expect(mockUpdateSchema).not.toHaveBeenCalled();

    releaseValidation(updateBody);
    await pending;
    await new Promise((resolve) => {
      nodeSetImmediate(resolve);
    });

    expect(first.conflict).not.toHaveBeenCalled();
    expect(mockUpdateSchema).toHaveBeenCalledTimes(1);
  });
});
