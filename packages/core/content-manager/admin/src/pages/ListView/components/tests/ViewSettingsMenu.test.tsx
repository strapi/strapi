import { render as renderRTL, screen, fireEvent } from '@tests/utils';
import { Route, Routes, useLocation } from 'react-router-dom';

import { ViewSettingsMenu, ViewSettingsMenuProps } from '../ViewSettingsMenu';

const LocationDisplay = () => {
  const location = useLocation();

  return <span>{location.pathname}</span>;
};

const render = (props?: Partial<ViewSettingsMenuProps>) =>
  renderRTL(<ViewSettingsMenu setHeaders={jest.fn()} resetHeaders={jest.fn()} {...props} />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <>
            <Routes>
              <Route path="/content-manager/:collectionType/:slug" element={children} />
            </Routes>
            <LocationDisplay />
          </>
        );
      },
    },
    initialEntries: ['/content-manager/collection-types/api::address.address'],
  });

/**
 * @note we do `user.click(document.body)` because otherwise our
 * tooltips remain open and then they're torn down which throws
 * react act errors.
 */
describe('ViewSettingsMenu', () => {
  it('should open the popover when you click on the button and render the available tools', async () => {
    const { user } = render();

    expect(
      await screen.findByRole('button', {
        name: 'View Settings',
      })
    ).toBeInTheDocument();

    await user.click(
      await screen.findByRole('button', {
        name: 'View Settings',
      })
    );

    await screen.findByRole('link', {
      name: 'Configure the view',
    });

    expect(await screen.findByText('Displayed fields')).toBeInTheDocument();

    expect(await screen.findByRole('checkbox', { name: 'createdAt' })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'id' })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'slug' })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'updatedAt' })).toBeInTheDocument();

    expect(
      await screen.findByRole('button', {
        name: 'Reset',
      })
    ).toBeInTheDocument();

    await user.click(document.body);
  });

  it('should contains the initially selected headers within the popover', async () => {
    const { user } = render({
      headers: ['id'],
    });

    await user.click(
      await screen.findByRole('button', {
        name: 'View Settings',
      })
    );

    expect(await screen.findByRole('checkbox', { name: 'createdAt' })).not.toBeChecked();
    expect(await screen.findByRole('checkbox', { name: 'id' })).toBeChecked();
    expect(await screen.findByRole('checkbox', { name: 'postal_code' })).not.toBeChecked();
    expect(await screen.findByRole('checkbox', { name: 'updatedAt' })).not.toBeChecked();

    await user.click(document.body);
  });

  it('should select an header', async () => {
    const setHeadersMock = jest.fn();
    const { user } = render({
      setHeaders: setHeadersMock,
    });

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(await screen.findByRole('checkbox', { name: 'createdAt' })).not.toBeChecked();
    fireEvent.click(await screen.findByRole('checkbox', { name: 'createdAt' }));

    expect(setHeadersMock).toHaveBeenCalledWith(['createdAt']);

    await user.click(document.body);
  });

  it('should reset the header selection when the reset button is clicked', async () => {
    const resetHeadersMock = jest.fn();
    const { user } = render({
      resetHeaders: resetHeadersMock,
    });

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(resetHeadersMock).toHaveBeenCalled();
  });

  it('should navigate to the configuration page when I click on the configure the view button', async () => {
    const { user } = render();

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    await user.click(
      screen.getByRole('link', {
        name: 'Configure the view',
      })
    );

    await screen.findByText(
      '/content-manager/collection-types/api::address.address/configurations/list'
    );
  });
});
