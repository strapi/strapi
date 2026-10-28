import adminController from '../admin';

describe('debugDump controller', () => {
  it('returns the collector payload under data', async () => {
    const payload = { dumpVersion: 1 };
    const generate = jest.fn(async () => payload);
    global.strapi = {
      admin: {
        services: {
          'debug-dump': { generate },
        },
      },
    } as any;

    const result = await adminController.debugDump();

    expect(generate).toHaveBeenCalled();
    expect(result).toEqual({ data: payload });
  });
});
