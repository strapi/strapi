import { Suspense } from 'react';

import { render, screen } from '@tests/utils';
import { Route, Routes } from 'react-router-dom';

import { CollectionTypePages } from '../CollectionTypePages';

const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/content-manager/:collectionType/:slug" element={<CollectionTypePages />} />
        <Route path="/404" element={<div>404 Not Found</div>} />
      </Routes>
    </Suspense>,
    {
      initialEntries,
    }
  );
};

describe('CollectionTypePages', () => {
  it('should render list view page for collection-types', async () => {
    renderWithRouter(['/content-manager/collection-types/api::address.address']);

    // The component should try to load the lazy component
    // We just verify it doesn't redirect to 404
    await screen.findByText('Loading...');
  });

  it('should render edit view page for single-types', async () => {
    renderWithRouter(['/content-manager/single-types/api::address.address']);

    // The component should try to load the lazy component
    await screen.findByText('Loading...');
  });

  it('should navigate to 404 for invalid collection type', async () => {
    renderWithRouter(['/content-manager/invalid-type/api::address.address']);

    await screen.findByText('404 Not Found');
  });
});
