import { act, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';

import { AssetsPage } from '../AssetsPage';

import type { File } from '../../../../../../shared/contracts/files';

/**
 * Infinite scroll is driven by an IntersectionObserver, which the shared test
 * setup stubs out with a no-op — the sentinel never reports itself visible.
 * Swapping the hook for a manual trigger is what lets a test reach page 2.
 */
let mockShowLoadMoreSentinel: () => void = () => {};

jest.mock('@strapi/admin/strapi-admin', () => {
  const actual = jest.requireActual('@strapi/admin/strapi-admin');
  const { useRef } = jest.requireActual('react');

  return {
    ...actual,
    useElementOnScreen: (onVisibilityChange: (isVisible: boolean) => void) => {
      mockShowLoadMoreSentinel = () => onVisibilityChange(true);

      return useRef(null);
    },
  };
});

const createAsset = (id: number, name: string): File => ({
  id,
  name,
  hash: `hash_${id}`,
  ext: '.png',
  mime: 'image/png',
  url: `/uploads/${name}`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
});

const createFolder = (id: number, name: string) => ({
  id,
  name,
  pathId: id,
  path: `/${id}`,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  children: { count: 0 },
  files: { count: 0 },
});

/** Surfaces the router search string so tests can assert on `?_q=`. */
const LocationProbe = () => {
  const { search } = useLocation();

  return <span data-testid="location-search">{search}</span>;
};

const respondWithAssets = (results: File[]) =>
  server.use(
    http.get('*/upload/files', () =>
      HttpResponse.json({
        results,
        pagination: { page: 1, pageSize: 20, pageCount: 1, total: results.length },
      })
    )
  );

const respondWithFolders = (data: ReturnType<typeof createFolder>[]) =>
  server.use(http.get('*/upload/folders', () => HttpResponse.json({ data })));

const renderPage = (search = '') =>
  render(
    <>
      <AssetsPage />
      <LocationProbe />
    </>,
    { initialEntries: [`/${search}`] }
  );

const findHeading = () => screen.findByRole('heading', { level: 1 });

describe('AssetsPage search', () => {
  beforeEach(() => {
    respondWithAssets([createAsset(1, 'image.png')]);
  });

  describe('search combined with list filters', () => {
    /** Captures the query string of every /upload/files request. */
    const captureFileRequests = () => {
      const requests: string[] = [];
      server.use(
        http.get('*/upload/files', ({ request }) => {
          requests.push(new URL(request.url).search);
          return HttpResponse.json({
            results: [createAsset(1, 'kitten.png')],
            pagination: { page: 1, pageSize: 20, pageCount: 1, total: 1 },
          });
        })
      );
      return requests;
    };

    it('sends the search term and the type filter in the same request', async () => {
      const requests = captureFileRequests();

      renderPage('?_q=kitten&filters=type:is:picture');

      await findHeading();

      await waitFor(() => expect(requests.length).toBeGreaterThan(0));
      const last = decodeURIComponent(requests[requests.length - 1]);
      // Both facets on the wire: global search + mime clause, no folder scope.
      expect(last).toContain('_q=kitten');
      expect(last).toContain('[mime][$contains]=image');
      expect(last).not.toContain('[folder]');
    });

    it('shows the filter badge and the search results title together', async () => {
      captureFileRequests();

      renderPage('?_q=kitten&filters=type:is:picture');

      expect(await findHeading()).toHaveTextContent('Search results for "kitten"');
      expect(await screen.findByTestId('filter-badge')).toHaveTextContent('Picture');
    });
  });

  it('shows the folder title and item count when not searching', async () => {
    renderPage();

    expect(await findHeading()).toHaveTextContent('Home (1 item)');
  });

  it('shows the search results title and the matching folder and asset totals', async () => {
    respondWithAssets([createAsset(1, 'image.png'), createAsset(2, 'other.png')]);

    renderPage('?_q=img');

    expect(await findHeading()).toHaveTextContent('Search results for "img" (1 folder - 2 assets)');
  });

  it('drops the assets half of the count when only folders match', async () => {
    respondWithAssets([]);
    respondWithFolders([createFolder(1, 'reports'), createFolder(2, 'report-archive')]);

    renderPage('?_q=report');

    const heading = await findHeading();

    expect(heading).toHaveTextContent('Search results for "report" (2 folders)');
    expect(heading).not.toHaveTextContent('0 assets');
  });

  it('drops the folders half of the count when only assets match', async () => {
    respondWithAssets([createAsset(1, 'a.png'), createAsset(2, 'b.png'), createAsset(3, 'c.png')]);
    respondWithFolders([]);

    renderPage('?_q=png');

    const heading = await findHeading();

    expect(heading).toHaveTextContent('Search results for "png" (3 assets)');
    expect(heading).not.toHaveTextContent('0 folders');
  });

  it('counts both halves when folders and assets match', async () => {
    respondWithAssets([createAsset(1, 'report.png')]);
    respondWithFolders([createFolder(1, 'reports'), createFolder(2, 'report-archive')]);

    renderPage('?_q=report');

    expect(await findHeading()).toHaveTextContent(
      'Search results for "report" (2 folders - 1 asset)'
    );
  });

  it('uses the singular form on both halves', async () => {
    respondWithAssets([createAsset(1, 'report.png')]);
    respondWithFolders([createFolder(1, 'reports')]);

    renderPage('?_q=report');

    expect(await findHeading()).toHaveTextContent(
      'Search results for "report" (1 folder - 1 asset)'
    );
  });

  it('leaves the folder heading count assets-only when not searching', async () => {
    respondWithAssets([createAsset(1, 'image.png')]);
    respondWithFolders([createFolder(1, 'reports'), createFolder(2, 'report-archive')]);

    renderPage();

    expect(await findHeading()).toHaveTextContent('Home (1 item)');
  });

  it('decodes the query before showing it in the title', async () => {
    renderPage('?_q=a%26b');

    expect(await findHeading()).toHaveTextContent('Search results for "a&b"');
  });

  // The side nav is `display: none` outside the medium breakpoint, which puts it
  // outside jsdom's accessibility tree — hence the test ids rather than roles.
  const findFolderTreeRows = () => screen.findAllByTestId(/^folder-tree-/);

  it('suppresses the folder tree highlight while searching', async () => {
    renderPage('?_q=img');

    const rows = await findFolderTreeRows();

    expect(rows.filter((row) => row.hasAttribute('aria-current'))).toHaveLength(0);
  });

  it('highlights the current folder when not searching', async () => {
    renderPage();

    await findFolderTreeRows();

    expect(screen.getByTestId('folder-tree-home')).toHaveAttribute('aria-current', 'page');
  });

  it('restores the tree highlight once the search is cleared', async () => {
    respondWithAssets([]);
    server.use(http.get('*/upload/folders', () => HttpResponse.json({ data: [] })));

    const { user } = renderPage('?_q=nothing');

    await user.click(await screen.findByRole('button', { name: 'Clear search' }));

    await waitFor(() => {
      expect(screen.getByTestId('folder-tree-home')).toHaveAttribute('aria-current', 'page');
    });
  });

  it('does not flash a zero count while a settled keystroke is in flight', async () => {
    respondWithAssets([createAsset(1, 'image.png'), createAsset(2, 'other.png')]);

    const { user } = renderPage();

    expect(await findHeading()).toHaveTextContent('Home (2 items)');

    // Hold the search response open so the transition render is observable.
    let releaseSearch: () => void = () => {};
    const searchResponded = new Promise<void>((resolve) => {
      releaseSearch = resolve;
    });
    server.use(
      http.get('*/upload/files', async () => {
        await searchResponded;
        return HttpResponse.json({
          results: [createAsset(3, 'img.png')],
          pagination: { page: 1, pageSize: 20, pageCount: 1, total: 1 },
        });
      })
    );

    await user.type(screen.getByRole('searchbox', { name: 'Search for an asset' }), 'img');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Search results for "img"'
      );
    });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('(1 folder - 2 assets)');

    releaseSearch();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('(1 folder - 1 asset)');
    });
  });

  /**
   * Crossing the search/no-search boundary inside a folder used to change the
   * `folder` argument too, which fires `useInfiniteAssets`' folder reset and
   * wipes the accumulator. The wipe only becomes visible once more than one
   * page has been accumulated — the reset back to page 1 is what re-runs the
   * memo over the emptied accumulator — hence the paging in these two tests.
   */
  describe('transitions inside a folder', () => {
    const PAGE_ONE = Array.from({ length: 20 }, (_, index) =>
      createAsset(index + 1, `page-one-${index}.png`)
    );
    const PAGE_TWO = [createAsset(100, 'page-two.png')];

    /** Two pages of assets for the folder list, one page for the search. */
    const respondWithPagedAssets = () =>
      server.use(
        http.get('*/upload/files', ({ request }) => {
          const isPageTwo = new URL(request.url).searchParams.get('page') === '2';

          return HttpResponse.json({
            results: isPageTwo ? PAGE_TWO : PAGE_ONE,
            pagination: { page: isPageTwo ? 2 : 1, pageSize: 20, pageCount: 2, total: 21 },
          });
        })
      );

    /**
     * Holds the next `/upload/files` response open so the transition render is
     * observable, and returns the release function.
     */
    const holdAssetsResponse = (results: File[]) => {
      let release: () => void = () => {};
      const responded = new Promise<void>((resolve) => {
        release = resolve;
      });

      server.use(
        http.get('*/upload/files', async () => {
          await responded;

          return HttpResponse.json({
            results,
            pagination: { page: 1, pageSize: 20, pageCount: 1, total: results.length },
          });
        })
      );

      return () => release();
    };

    beforeEach(() => {
      // No folders, so a wiped asset list would surface the empty state.
      server.use(http.get('*/upload/folders', () => HttpResponse.json({ data: [] })));
    });

    /** Reports the load-more sentinel as visible, which fetches the next page. */
    const scrollToLoadMore = async () => {
      await act(async () => {
        mockShowLoadMoreSentinel();
      });
    };

    it('keeps the folder assets rendered while a search started inside a folder is in flight', async () => {
      respondWithPagedAssets();

      const { user } = renderPage('?folder=1');

      expect(await screen.findByText('page-one-0.png')).toBeInTheDocument();

      await scrollToLoadMore();
      expect(await screen.findByText('page-two.png')).toBeInTheDocument();

      const releaseSearch = holdAssetsResponse([createAsset(200, 'match.png')]);

      await user.type(screen.getByRole('searchbox', { name: 'Search for an asset' }), 'match');

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
          'Search results for "match"'
        );
      });

      // The folder's assets must still be on screen — no blank, no empty state.
      expect(screen.getByText('page-one-0.png')).toBeInTheDocument();
      expect(screen.getByText('page-two.png')).toBeInTheDocument();
      expect(screen.queryByText('No results found')).not.toBeInTheDocument();

      releaseSearch();

      expect(await screen.findByText('match.png')).toBeInTheDocument();
      expect(screen.queryByText('page-one-0.png')).not.toBeInTheDocument();
    });

    it('keeps the search results rendered while a search cleared inside a folder is in flight', async () => {
      respondWithPagedAssets();

      const { user } = renderPage('?folder=1&_q=match');

      expect(await screen.findByText('page-one-0.png')).toBeInTheDocument();

      await scrollToLoadMore();
      expect(await screen.findByText('page-two.png')).toBeInTheDocument();

      const releaseFolder = holdAssetsResponse([createAsset(200, 'in-folder.png')]);

      // The empty state's "Clear search" action isn't rendered while there are
      // results, so clear the toolbar input instead.
      await user.click(screen.getByRole('button', { name: 'Clear' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).not.toHaveTextContent(
          'Search results for'
        );
      });

      expect(screen.getByText('page-one-0.png')).toBeInTheDocument();
      expect(screen.getByText('page-two.png')).toBeInTheDocument();
      expect(screen.queryByText('No assets yet')).not.toBeInTheDocument();

      releaseFolder();

      expect(await screen.findByText('in-folder.png')).toBeInTheDocument();
      expect(screen.queryByText('page-one-0.png')).not.toBeInTheDocument();
    });
  });

  it('preserves ?folder= so clearing the search is reversible', async () => {
    renderPage('?folder=1&_q=img');

    await findHeading();

    expect(screen.getByTestId('location-search')).toHaveTextContent('folder=1');
  });

  describe('no results', () => {
    beforeEach(() => {
      respondWithAssets([]);
      server.use(http.get('*/upload/folders', () => HttpResponse.json({ data: [] })));
    });

    it('renders the search empty state rather than the no-assets one', async () => {
      renderPage('?_q=nothing');

      expect(await screen.findByText('No results found')).toBeInTheDocument();
      expect(screen.queryByText('No assets yet')).not.toBeInTheDocument();
    });

    it('removes _q when the Clear search button is used', async () => {
      const { user } = renderPage('?_q=nothing');

      await user.click(await screen.findByRole('button', { name: 'Clear search' }));

      await waitFor(() => {
        expect(screen.getByTestId('location-search')).not.toHaveTextContent('_q');
      });
    });

    it('restores the folder title after the search is cleared', async () => {
      const { user } = renderPage('?_q=nothing');

      await user.click(await screen.findByRole('button', { name: 'Clear search' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Home');
      });
      expect(screen.queryByText(/Search results for/)).not.toBeInTheDocument();
    });
  });
});
