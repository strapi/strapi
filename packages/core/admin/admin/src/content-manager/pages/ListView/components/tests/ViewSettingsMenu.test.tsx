import { render, waitFor, screen, fireEvent } from '@tests/utils';
import { Location } from 'history';
import { Route } from 'react-router-dom';

import { ViewSettingsMenu } from '../ViewSettingsMenu';

/**
 * @note we do `user.click(document.body)` because otherwise our
 * tooltips remain open and then they're torn down which throws
 * react act errors.
 */
describe('ViewSettingsMenu', () => {
  it('should show the cog button by default', () => {
    render(<ViewSettingsMenu slug="api::temp.temp" />);

    expect(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    ).toBeInTheDocument();
  });

  it('should open the popover when you click on the button and render the available tools', async () => {
    const { user } = render(<ViewSettingsMenu slug="api::temp.temp" />);

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(
      screen.getByRole('link', {
        name: 'Configure the view',
      })
    ).toBeInTheDocument();

    expect(screen.getByText('Displayed fields')).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'createdAt' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'id' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'name' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'updatedAt' })).toBeInTheDocument();

    expect(
      screen.getByRole('button', {
        name: 'Reset',
      })
    ).toBeInTheDocument();

    await user.click(document.body);
  });

  it('should contains the initially selected headers within the popover', async () => {
    const { user } = render(<ViewSettingsMenu slug="api::temp.temp" />);

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(screen.getByRole('checkbox', { name: 'createdAt' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'id' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'name' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'updatedAt' })).not.toBeChecked();

    await user.click(document.body);
  });

  it('should select an header', async () => {
    const { user } = render(<ViewSettingsMenu slug="api::temp.temp" />);

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(screen.getByRole('checkbox', { name: 'createdAt' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'createdAt' }));
    expect(screen.getByRole('checkbox', { name: 'createdAt' })).toBeChecked();

    expect(screen.getByRole('checkbox', { name: 'id' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'id' }));
    expect(screen.getByRole('checkbox', { name: 'id' })).not.toBeChecked();

    await user.click(document.body);
  });

  it('should reset the header selection when the reset button is clicked', async () => {
    const { user } = render(<ViewSettingsMenu slug="api::temp.temp" />);

    await user.click(
      screen.getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(screen.getByRole('checkbox', { name: 'createdAt' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'createdAt' }));
    expect(screen.getByRole('checkbox', { name: 'createdAt' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Reset' }));

    expect(screen.getByRole('checkbox', { name: 'createdAt' })).not.toBeChecked();
  });

  it('should navigate to the configuration page when I click on the configure the view button', async () => {
    let testLocation: Location = null!;

    const { user } = render(<ViewSettingsMenu slug="api::temp.temp" />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}
              <Route
                path="*"
                render={({ location }) => {
                  testLocation = location;

                  return null;
                }}
              />
            </>
          );
        },
      },
    });

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

    await waitFor(() => {
      expect(testLocation.pathname).toBe('/api::temp.temp/configurations/list');
    });
  });
});
