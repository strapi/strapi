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

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    expect(cogBtn).toBeInTheDocument();
  });

  it('should open the Popover when you click on the Cog Button', async () => {
    const { getByRole, user } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />);

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    await user.click(cogBtn);

    const configureViewLink = getByRole('link', {
      name: 'Configure the view',
    });

    expect(configureViewLink).toBeInTheDocument();
  });

  it('should show inside the Popover the Configure the view link button', async () => {
    let testLocation = null;

    const { getByRole, user } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />, {
      renderOptions: {
        wrapper({ children }) {
          return (
            <>
              {children}{' '}
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

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    await user.click(cogBtn);

    const configureViewLink = getByRole('link', {
      name: 'Configure the view',
    });

    expect(configureViewLink).toBeInTheDocument();

    await user.click(configureViewLink);

    await waitFor(() => {
      expect(testLocation.pathname).toBe('/api::temp.temp/configurations/list');
    });
  });

  it('should show inside the Popover the title Dysplayed fields title', async () => {
    const { getByText, getByRole, user } = render(
      <ViewSettingsMenu layout={layout} slug="api::temp.temp" />
    );

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    await user.click(cogBtn);

    expect(getByText('Displayed fields')).toBeInTheDocument();
  });

  it('should show inside the Popover the reset button', async () => {
    const { getByRole, user } = render(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />);

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    await user.click(cogBtn);

    const resetBtn = getByRole('button', {
      name: 'Reset',
    });

    expect(resetBtn).toBeInTheDocument();
  });
});
