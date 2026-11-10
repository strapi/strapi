import * as React from 'react';

import { within } from '@testing-library/react';
import { render as renderRTL, screen, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useIsMobile: jest.fn().mockReturnValue(false),
}));

import { HistoryProvider } from '../../pages/History';
import { mockHistoryVersionsData } from '../../tests/mockData';
import { VersionsList } from '../VersionsList';

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testid="location">{location.search}</span>;
};

const render = (ui: React.ReactElement) =>
  renderRTL(ui, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <>
            {children}
            <LocationDisplay />
          </>
        );
      },
    },
  });

describe('VersionsList', () => {
  it('renders a list of history versions', async () => {
    const { user } = render(
      // @ts-expect-error we don't need all the context
      <HistoryProvider page={1} versions={mockHistoryVersionsData.historyVersions}>
        <VersionsList />
      </HistoryProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Versions')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();

    // Displays the right info for each version
    const versions = screen.getAllByRole('link');
    expect(within(versions[0]).getByText(/current/i)).toBeInTheDocument();
    expect(within(versions[0]).queryByText(/by/i)).not.toBeInTheDocument();
    expect(within(versions[1]).queryByText(/current/i)).not.toBeInTheDocument();
    expect(within(versions[1]).getByText(/draft/i)).toBeInTheDocument();
    expect(within(versions[1]).getByText(/by/i)).toBeInTheDocument();
    expect(within(versions[1]).getByText('1/31/2024, 03:58 PM')).toBeInTheDocument();
    expect(within(versions[1]).getByText('Deploy token')).toBeInTheDocument();
    expect(within(versions[1]).getByText('Token')).toBeInTheDocument();

    // Displays the source of each version
    expect(within(versions[0]).getByText('Admin panel')).toBeInTheDocument();
    expect(within(versions[1]).getByText('Admin API')).toBeInTheDocument();

    // Redirects to 2nd version on click
    await user.click(versions[1]);
    expect(await screen.findByText('?id=25')).toBeInTheDocument();

    // Redirects to 1st version again on click
    await user.click(versions[0]);
    expect(await screen.findByText('?id=26')).toBeInTheDocument();
  });

  it.each([
    ['person', 'admin::user', 'Deleted user'],
    ['token', 'admin::api-token', 'Deleted token'],
  ])('names a deleted %s author', async (type, model, label) => {
    const [currentVersion, version] = mockHistoryVersionsData.historyVersions.data;
    const versions = {
      ...mockHistoryVersionsData.historyVersions,
      data: [currentVersion, { ...version, author: { type, model, id: null, name: null } }],
    };

    render(
      // @ts-expect-error we don't need all the context
      <HistoryProvider page={1} versions={versions}>
        <VersionsList />
      </HistoryProvider>
    );

    expect(within(screen.getAllByRole('link')[1]).getByText(label)).toBeInTheDocument();
  });

  describe('author name tooltip', () => {
    const mockNameWidth = (scrollWidth: number) => [
      jest.spyOn(Element.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth),
      jest.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(100),
    ];
    let widthMocks: jest.SpyInstance[] = [];

    afterEach(() => {
      widthMocks.forEach((mock) => mock.mockRestore());
    });

    const renderVersions = () =>
      render(
        // @ts-expect-error we don't need all the context
        <HistoryProvider page={1} versions={mockHistoryVersionsData.historyVersions}>
          <VersionsList />
        </HistoryProvider>
      );

    it('shows the full name of a cut name on hover', async () => {
      widthMocks = mockNameWidth(200);
      const { user } = renderVersions();

      await user.hover(within(screen.getAllByRole('link')[1]).getByText('Deploy token'));

      expect(await screen.findByRole('tooltip', { name: 'Deploy token' })).toBeInTheDocument();
    });

    it('shows the full name of a cut name on keyboard focus', async () => {
      widthMocks = mockNameWidth(200);
      const { user } = renderVersions();

      await user.tab();
      await user.tab();

      expect(screen.getAllByRole('link')[1]).toHaveFocus();
      expect(await screen.findByRole('tooltip', { name: 'Deploy token' })).toBeInTheDocument();
    });

    it('shows no tooltip for a name that fits', async () => {
      widthMocks = mockNameWidth(100);
      const { user } = renderVersions();

      await user.hover(within(screen.getAllByRole('link')[1]).getByText('Deploy token'));

      await expect(
        waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument(), { timeout: 1500 })
      ).rejects.toThrow();
    });
  });
});
