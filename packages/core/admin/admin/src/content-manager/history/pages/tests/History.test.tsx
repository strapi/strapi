import * as React from 'react';

import { waitForElementToBeRemoved } from '@testing-library/react';
import { render as renderRTL, screen } from '@tests/utils';
import { Route, Routes, useLocation } from 'react-router-dom';

import { HistoryPage } from '../History';

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testid="location">{location.search}</span>;
};

const render = ({ path, initialEntries }: { path: string; initialEntries: string[] }) =>
  renderRTL(
    <Routes>
      <Route path={path} element={<HistoryPage />} />
    </Routes>,
    {
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
      initialEntries,
    }
  );

describe('History page', () => {
  it('renders single type correctly', async () => {
    render({
      path: '/content-manager/:singleType/:slug/history',
      initialEntries: ['/content-manager/single-types/api::homepage.homepage/history'],
    });

    // Redirects to the first version when it's loaded
    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));
    expect(await screen.findByText('?id=26')).toBeInTheDocument();

    expect(document.title).toBe('Homepage history');
  });

  it('renders collection type correctly', async () => {
    render({
      path: '/content-manager/:collectionType/:slug/:id/history',
      initialEntries: ['/content-manager/collection-types/api::address.address/1/history'],
    });

    // Redirects to the first version when it's loaded
    await waitForElementToBeRemoved(() => screen.queryByTestId('loader'));
    expect(await screen.findByText('?id=26')).toBeInTheDocument();

    expect(document.title).toBe('Address history');
  });
});
