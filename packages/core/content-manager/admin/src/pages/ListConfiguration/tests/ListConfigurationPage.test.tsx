import { fireEvent, waitFor, render as renderRTL, screen } from '@tests/utils';
import { Route, Routes, useLocation } from 'react-router-dom';

import { mockData } from '../../../../tests/mockData';
import { ListConfiguration } from '../ListConfigurationPage';

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testid="location-search">{location.search}</span>;
};

const render = ({
  initialEntries = [
    `/content-manager/collection-types/${mockData.contentManager.contentType}/configurations/list`,
  ],
} = {}) => ({
  ...renderRTL(<ListConfiguration />, {
    initialEntries,
    renderOptions: {
      wrapper({ children }) {
        return (
          <>
            <Routes>
              <Route
                path="/content-manager/:collectionType/:slug/configurations/list"
                element={children}
              />
            </Routes>
            <LocationDisplay />
          </>
        );
      },
    },
  }),
});

describe('Configure the List View', () => {
  it('renders and matches the snapshot', async () => {
    render();

    await screen.findByRole('heading', { name: 'Configure the view - Address' });

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable search' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable filters' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Enable bulk actions' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Entries per page' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Default sort attribute' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Default sort order' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'View' })).toBeInTheDocument();

    /**
     * For each attribute it should have the following
     */
    mockData.contentManager.collectionTypeConfiguration.contentType.layouts.list.forEach(
      (attribute) => {
        expect(screen.getByRole('button', { name: `Edit ${attribute}` })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: `Delete ${attribute}` })).toBeInTheDocument();
      }
    );

    expect(screen.getByRole('button', { name: 'Add a field' })).toBeInTheDocument();
  });

  it('should add field', async () => {
    const { getByRole, user, findByRole } = render();

    await findByRole('heading', { name: 'Configure the view - Address' });

    await user.click(getByRole('button', { name: 'Add a field' }));
    await user.click(getByRole('menuitem', { name: 'slug' }));

    expect(getByRole('button', { name: `Edit slug` })).toBeInTheDocument();
    expect(getByRole('button', { name: `Delete slug` })).toBeInTheDocument();
  });

  it('should let me re-add a field I just removed from the original list', async () => {
    const { getByRole, user, findByRole } = render();

    await findByRole('heading', { name: 'Configure the view - Address' });

    await user.click(getByRole('button', { name: 'Delete id' }));
    await user.click(getByRole('button', { name: 'Add a field' }));
    await user.click(getByRole('menuitem', { name: 'id' }));

    expect(getByRole('button', { name: `Edit id` })).toBeInTheDocument();
    expect(getByRole('button', { name: `Delete id` })).toBeInTheDocument();
  });

  describe('Edit modal', () => {
    it('should open edit modal & close upon editing and pressing finish', async () => {
      const { getByRole, queryByRole, user, findByRole } = render();

      await findByRole('heading', { name: 'Configure the view - Address' });

      await user.click(getByRole('button', { name: 'Edit id' }));

      expect(getByRole('dialog', { name: 'Edit Id' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'Edit Id' })).toBeInTheDocument();
      expect(getByRole('textbox', { name: 'Label' })).toBeInTheDocument();
      expect(getByRole('checkbox', { name: 'Enable sort on this field' })).toBeInTheDocument();

      await user.type(getByRole('textbox', { name: 'Label' }), 'testname');

      expect(getByRole('button', { name: 'Finish' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

      fireEvent.click(getByRole('button', { name: 'Finish' }));

      await waitFor(() =>
        expect(queryByRole('dialog', { name: 'Edit Id' })).not.toBeInTheDocument()
      );
    });

    it('should close edit modal when pressing cancel', async () => {
      const { getByRole, queryByRole, user, findByRole } = render();

      await findByRole('heading', { name: 'Configure the view - Address' });

      await user.click(getByRole('button', { name: 'Edit id' }));

      expect(getByRole('dialog', { name: 'Edit Id' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: 'Cancel' }));

      await waitFor(() =>
        expect(queryByRole('dialog', { name: 'Edit Id' })).not.toBeInTheDocument()
      );
    });
  });
});
