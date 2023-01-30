import { renderHook } from '@testing-library/react-hooks';
import useLazyComponents from '../index';

const mockCustomField = {
  'plugin::test.color': {
    name: 'color',
    pluginId: 'mycustomfields',
    type: 'text',
    icon: jest.fn(),
    intlLabel: {
      id: 'mycustomfields.color.label',
      defaultMessage: 'Color',
    },
    intlDescription: {
      id: 'mycustomfields.color.description',
      defaultMessage: 'Select any color',
    },
    components: {
      Input: jest.fn().mockResolvedValue({ default: jest.fn() }),
    },
  },
  'plugin::test.hex': {
    name: 'hex',
    pluginId: 'mycustomfields',
    type: 'text',
    icon: jest.fn(),
    intlLabel: {
      id: 'mycustomfields.hex.label',
      defaultMessage: 'Hex',
    },
    intlDescription: {
      id: 'mycustomfields.hex.description',
      defaultMessage: 'Select any hex',
    },
    components: {
      Input: jest.fn().mockResolvedValue({ default: jest.fn() }),
    },
  },
};

jest.mock('@strapi/helper-plugin', () => ({
  useCustomFields: () => ({
    get: jest.fn().mockImplementation((uid) => mockCustomField[uid]),
  }),
}));

describe('useLazyComponents', () => {
  let cleanup;

  afterEach(() => {
    if (typeof cleanup === 'function') {
      cleanup();
      cleanup = undefined;
    }
  });

  it('lazy loads the components', async () => {
    const { result, waitFor } = renderHook(() => useLazyComponents(['plugin::test.color']));

    cleanup = result.current.cleanup;

    expect(result.current.isLazyLoading).toEqual(true);
    expect(result.current.lazyComponentStore).toEqual({});

    await waitFor(() => expect(result.current.isLazyLoading).toEqual(false));

    expect(result.current.lazyComponentStore['plugin::test.color']).toBeDefined();
  });

  test('assuming the store has been initialised before hand, other hooks called should be able to access the global cache', async () => {
    const { result: initialResult, waitFor } = renderHook(() =>
      useLazyComponents(['plugin::test.color'])
    );

    await waitFor(() =>
      expect(initialResult.current.lazyComponentStore['plugin::test.color']).toBeDefined()
    );

    const { result: actualResult, waitFor: secondWaitFor } = renderHook(() => useLazyComponents());

    cleanup = actualResult.current.cleanup;

    await secondWaitFor(() => expect(actualResult.current.isLazyLoading).toBe(false));

    expect(actualResult.current.lazyComponentStore['plugin::test.color']).toBeDefined();
  });

  test('given there are no components to load it should not be loading and the store should be empty', async () => {
    const { result } = renderHook(() => useLazyComponents([]));

    expect(result.current.isLazyLoading).toEqual(false);
    expect(result.current.lazyComponentStore).toEqual({});
  });

  test('assuming the store has been initialised before hand, other hooks called should be able to modify the global cache and access it', async () => {
    const { result: initialResult, waitFor } = renderHook(() =>
      useLazyComponents(['plugin::test.color'])
    );

    await waitFor(() =>
      expect(initialResult.current.lazyComponentStore['plugin::test.color']).toBeDefined()
    );

    const { result: actualResult, waitFor: secondWaitFor } = renderHook(() =>
      useLazyComponents(['plugin::test.hex'])
    );

    cleanup = actualResult.current.cleanup;

    await secondWaitFor(() => expect(actualResult.current.isLazyLoading).toBe(false));

    expect(actualResult.current.lazyComponentStore['plugin::test.hex']).toBeDefined();
    expect(actualResult.current.lazyComponentStore['plugin::test.color']).toBeDefined();
  });
});
