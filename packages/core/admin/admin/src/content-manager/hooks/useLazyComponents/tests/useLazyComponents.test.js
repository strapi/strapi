import { renderHook } from '@testing-library/react-hooks';
import useLazyComponents from '../index';

const mockCustomField = {
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
};

jest.mock('@strapi/helper-plugin', () => ({
  useCustomFields: () => ({
    get: jest.fn().mockReturnValue(mockCustomField),
  }),
}));

describe('useLazyComponents', () => {
  it('lazy loads the components', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLazyComponents(['plugin::test.test'])
    );

    expect(result.current).toEqual({ isLazyLoading: true, lazyComponentStore: {} });

    await waitForNextUpdate();

    expect(JSON.stringify(result.current)).toEqual(
      JSON.stringify({
        isLazyLoading: false,
        lazyComponentStore: { 'plugin::test.test': jest.fn() },
      })
    );
  });
  it('handles no components to load', async () => {
    const { result } = renderHook(() => useLazyComponents([]));

    expect(result.current).toEqual({ isLazyLoading: false, lazyComponentStore: {} });
  });
});
