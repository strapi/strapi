/* eslint-disable check-file/filename-naming-convention */
import { render, screen, waitFor } from '@tests/utils';
import { Routes, Route } from 'react-router-dom';

import { useContentManagerInitData } from '../hooks/useContentManagerInitData';
import { Layout } from '../layout';

import type { AppState } from '../modules/app';

jest.mock('../hooks/useContentManagerInitData');

const mockedUseContentManagerInitData = jest.mocked(useContentManagerInitData);

const setInitData = (data: Partial<AppState>) => {
  mockedUseContentManagerInitData.mockReturnValue({
    isLoading: false,
    collectionTypeLinks: [],
    singleTypeLinks: [],
    components: [],
    fieldSizes: {},
    models: [],
    ...data,
  });
};

const renderLayout = () =>
  render(
    <Routes>
      <Route path="/content-manager/*" element={<Layout />} />
      <Route path="/content-manager/403" element={<div>no-permissions-page</div>} />
      <Route path="/403" element={<div>admin-catch-all</div>} />
    </Routes>,
    { initialEntries: ['/content-manager'] }
  );

describe('Content Manager | Layout', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Regression test for https://github.com/strapi/strapi/issues/26707:
   * when the user has no authorised models for the active locale, the layout must
   * redirect to the Content Manager's own NoPermissions route (`/content-manager/403`)
   * and not to `/403`, which is not a registered route and renders "Page not found".
   */
  it('redirects to the content-manager 403 page when there are no authorised models', async () => {
    setInitData({
      collectionTypeLinks: [],
      singleTypeLinks: [],
      // The layout only inspects `isDisplayed`, so a minimal model is enough here.
      models: [
        {
          uid: 'api::article.article',
          isDisplayed: true,
        } as unknown as AppState['models'][number],
      ],
    });

    renderLayout();

    await waitFor(() => {
      expect(screen.getByText('no-permissions-page')).toBeInTheDocument();
    });
    expect(screen.queryByText('admin-catch-all')).not.toBeInTheDocument();
  });
});
