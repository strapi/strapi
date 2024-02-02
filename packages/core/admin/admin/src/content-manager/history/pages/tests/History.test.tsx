import { render, screen, waitFor } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { HistoryPage } from '../History';

describe('History page', () => {
  it('renders single type correctly', async () => {
    render(
      <Routes>
        <Route path="/content-manager/:singleType/:slug/history" element={<HistoryPage />} />
      </Routes>,
      {
        initialEntries: ['/content-manager/single-types/api::homepage.homepage/history?id=26'],
      }
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
    expect(document.title).toBe('Homepage history');
  });

  it('renders collection type correctly', async () => {
    render(
      <Routes>
        <Route
          path="/content-manager/:collectionType/:slug/:id/history"
          element={<HistoryPage />}
        />
      </Routes>,
      {
        initialEntries: ['/content-manager/collection-types/api::address.address/1/history?id=26'],
      }
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loader')).not.toBeInTheDocument();
    });
  });
});
