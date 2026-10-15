import { resolveHistoryOrigin } from '../origin';

const buildRequestContext = (info: { pluginName?: string; type: string }) =>
  ({ state: { route: { info } } }) as any;

describe('resolveHistoryOrigin', () => {
  const contentManagerRequest = buildRequestContext({
    pluginName: 'content-manager',
    type: 'admin',
  });
  const contentApiRequest = buildRequestContext({ type: 'content-api' });
  const otherAdminRequests = {
    'review-workflows': buildRequestContext({ pluginName: 'review-workflows', type: 'admin' }),
    'content-manager-xyz': buildRequestContext({
      pluginName: 'content-manager-xyz',
      type: 'admin',
    }),
  };

  describe.each([true, false])('with the content API flag set to %s', (isContentApiEnabled) => {
    it('resolves the content-manager origin', () => {
      expect(resolveHistoryOrigin(contentManagerRequest, { isContentApiEnabled })).toBe(
        'content-manager'
      );
    });

    it.each(Object.entries(otherAdminRequests))(
      'resolves no origin for the %s admin route',
      (_name, request) => {
        expect(resolveHistoryOrigin(request, { isContentApiEnabled })).toBeNull();
      }
    );

    it('resolves no origin without a matched route', () => {
      expect(resolveHistoryOrigin({ state: {} } as any, { isContentApiEnabled })).toBeNull();
    });
  });

  it('resolves the content-api origin when the flag is on', () => {
    expect(resolveHistoryOrigin(contentApiRequest, { isContentApiEnabled: true })).toBe(
      'content-api'
    );
  });

  it('resolves no origin for a content API request when the flag is off', () => {
    expect(resolveHistoryOrigin(contentApiRequest, { isContentApiEnabled: false })).toBeNull();
  });
});
