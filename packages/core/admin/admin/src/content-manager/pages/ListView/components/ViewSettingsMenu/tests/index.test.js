import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { fireEvent, render as renderRTL, waitFor } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { combineReducers, createStore } from 'redux';

import reducers from '../../../../../../reducers';
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

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line react/prop-types
  CheckPermissions: ({ children }) => <div>{children}</div>,
}));

const history = createMemoryHistory();

const render = () => ({
  ...renderRTL(<ViewSettingsMenu layout={layout} slug="api::temp.temp" />, {
    wrapper({ children }) {
      const rootReducer = combineReducers(reducers);

      const store = createStore(rootReducer, {
        'content-manager_listView': {
          displayedHeaders: [],
        },
        admin_app: {
          permissions: {
            contentManager: {},
          },
        },
      });

      return (
        <Router history={history}>
          <IntlProvider messages={{}} textComponent="span" locale="en">
            <ThemeProvider theme={lightTheme}>
              <Provider store={store}>{children}</Provider>
            </ThemeProvider>
          </IntlProvider>
        </Router>
      );
    },
  }),
});

describe('Content Manager | List view | ViewSettingsMenu', () => {
  it('should show the Cog Button', () => {
    const { getByRole } = render();

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    expect(cogBtn).toBeInTheDocument();
  });

  it('should open the Popover when you click on the Cog Button', () => {
    const { getByRole } = render();

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    fireEvent.click(cogBtn);

    const configureViewLink = getByRole('link', {
      name: 'Configure the view',
    });

    expect(configureViewLink).toBeInTheDocument();
  });

  it('should show inside the Popover the Configure the view link button', async () => {
    const { getByRole } = render();

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    fireEvent.click(cogBtn);

    const configureViewLink = getByRole('link', {
      name: 'Configure the view',
    });

    expect(configureViewLink).toBeInTheDocument();

    fireEvent.click(configureViewLink);
    await waitFor(() => {
      expect(history.location.pathname).toBe('/api::temp.temp/configurations/list');
    });
  });

  it('should show inside the Popover the title Dysplayed fields title', async () => {
    const { getByText, getByRole } = render();

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    fireEvent.click(cogBtn);

    expect(getByText('Displayed fields')).toBeInTheDocument();
  });

  it('should show inside the Popover the reset button', () => {
    const { getByRole } = render();

    const cogBtn = getByRole('button', {
      name: 'View Settings',
    });

    fireEvent.click(cogBtn);

    const resetBtn = getByRole('button', {
      name: 'Reset',
    });

    expect(resetBtn).toBeInTheDocument();
  });
});
