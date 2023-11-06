import React from 'react';

import { render, waitFor } from '@tests/utils';
import { Route } from 'react-router-dom';

import { ViewSettingsMenu } from '../index';

const layout = {
  contentType: {
    attributes: {
      id: { type: 'integer' },
      name: { type: 'string' },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
    },
    metadatas: {
      id: {
        list: { label: 'id', searchable: true, sortable: true },
      },
      name: {
        list: { label: 'name', searchable: true, sortable: true },
      },
      createdAt: {
        list: { label: 'createdAt', searchable: true, sortable: true },
      },
      updatedAt: {
        list: { label: 'updatedAt', searchable: true, sortable: true },
      },
    },
    layouts: {
      list: [],
    },
    options: {},
    settings: {},
  },
};

describe('Content Manager | List view | ViewSettingsMenu', () => {
  it('should show the Cog Button', () => {
    const { getByRole } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />);

    expect(
      getByRole('button', {
        name: 'View Settings',
      })
    ).toBeInTheDocument();
  });

  it('should open the Popover when you click on the Cog Button', async () => {
    const { getByRole, user } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />);

    await user.click(
      getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(
      getByRole('link', {
        name: 'Configure the view',
      })
    ).toBeInTheDocument();
  });

  it('should show inside the Popover the Configure the view link button', async () => {
    let testLocation = null;

    const { getByRole, user } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />, {
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
      getByRole('button', {
        name: 'View Settings',
      })
    );

    await user.click(
      getByRole('link', {
        name: 'Configure the view',
      })
    );

    await waitFor(() => {
      expect(testLocation.pathname).toBe('/api::temp.temp/configurations/list');
    });
  });

  it('should show inside the Popover the title Dysplayed fields title', async () => {
    const { getByText, getByRole, user } = render(
      <ViewSettingsMenu layout={layout} slug="api::temp.temp" />
    );

    await user.click(
      getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(getByText('Displayed fields')).toBeInTheDocument();

    await user.click(getByRole('checkbox', { name: 'createdAt' }));

    await user.keyboard('[Escape]');
  });

  it('should show inside the Popover the reset button', async () => {
    const { getByRole, user } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />);

    await user.click(
      getByRole('button', {
        name: 'View Settings',
      })
    );

    expect(
      getByRole('button', {
        name: 'Reset',
      })
    ).toBeInTheDocument();

    await user.click(getByRole('checkbox', { name: 'createdAt' }));

    await user.keyboard('[Escape]');
  });
});
