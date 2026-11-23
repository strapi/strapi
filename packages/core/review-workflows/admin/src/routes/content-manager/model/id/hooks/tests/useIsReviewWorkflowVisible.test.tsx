import { renderHook } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { useIsReviewWorkflowVisible } from '../useIsReviewWorkflowVisible';

const useDocumentLayoutMock = jest.fn();

jest.mock('@strapi/content-manager/strapi-admin', () => ({
  get unstable_useDocumentLayout() {
    return useDocumentLayoutMock;
  },
}));

type ActiveTab = Parameters<typeof useIsReviewWorkflowVisible>[0]['activeTab'];

const render = ({
  activeTab = 'draft',
  path = '/content-manager/collection-types/api::address.address/1234',
}: {
  activeTab?: ActiveTab;
  path?: string;
} = {}) =>
  renderHook(() => useIsReviewWorkflowVisible({ activeTab }), {
    wrapper: ({ children }) => (
      <Routes>
        <Route path="/content-manager/:collectionType/:slug/:id?" element={children} />
      </Routes>
    ),
    initialEntries: [path],
  });

beforeEach(() => {
  window.strapi.isEE = true;
  useDocumentLayoutMock.mockReturnValue({ edit: { options: { reviewWorkflows: true } } });
});

afterEach(() => {
  window.strapi.isEE = false;
});

describe('useIsReviewWorkflowVisible', () => {
  it('is visible on the draft tab', () => {
    const { result } = render({ activeTab: 'draft' });

    expect(result.current).toBe(true);
  });

  it('is visible when there is no active tab', () => {
    const { result } = render({ activeTab: null });

    expect(result.current).toBe(true);
  });

  it('is hidden on the published tab', () => {
    const { result } = render({ activeTab: 'published' });

    expect(result.current).toBe(false);
  });

  it('is hidden in the community edition', () => {
    window.strapi.isEE = false;

    const { result } = render();

    expect(result.current).toBe(false);
  });

  it('is hidden when review workflows are disabled on the content type', () => {
    useDocumentLayoutMock.mockReturnValue({ edit: { options: {} } });

    const { result } = render();

    expect(result.current).toBe(false);
  });

  it('is hidden when creating an entry', () => {
    const { result } = render({
      path: '/content-manager/collection-types/api::address.address/create',
    });

    expect(result.current).toBe(false);
  });

  it('is hidden on a collection type without an entry id', () => {
    const { result } = render({ path: '/content-manager/collection-types/api::address.address' });

    expect(result.current).toBe(false);
  });

  it('is visible on a single type', () => {
    const { result } = render({ path: '/content-manager/single-types/api::homepage.homepage' });

    expect(result.current).toBe(true);
  });
});
