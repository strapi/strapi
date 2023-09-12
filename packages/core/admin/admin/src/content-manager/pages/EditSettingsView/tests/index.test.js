import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { NotificationsProvider } from '@strapi/helper-plugin';
import { fireEvent, render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore } from 'redux';

import EditSettingsView from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  // eslint-disable-next-line
  CheckPermissions: ({ children }) => <div>{children}</div>,
}));

const mainLayout = {
  attributes: {
    id: { type: 'integer' },
    categories: { type: 'integer' },
    postal_code: { type: 'integer' },
  },
  kind: 'collectionType',
  layouts: {
    edit: [
      [
        { name: 'postal_code', size: 6 },
        { name: 'city', size: 6 },
      ],
    ],
    list: [],
  },
  metadatas: {
    postal_code: { edit: { visible: true }, list: { label: 'postal_code' } },
    city: { edit: { visible: true }, list: { label: 'city' } },
    categories: { edit: { visible: true }, list: { label: 'categories' } },
  },
  settings: { mainField: 'postal_code' },
  options: {},
  info: {
    description: 'the address',
    displayName: 'address',
    label: 'address',
    name: 'address',
  },
};

const components = {
  compo1: { uid: 'compo1' },
};

const render = ({ layout } = {}) => ({
  ...renderRTL(
    <EditSettingsView
      mainLayout={layout || mainLayout}
      components={components}
      isContentTypeView
      slug="api::address.address"
    />,
    {
      wrapper({ children }) {
        const store = createStore((state) => state, {
          'content-manager_app': {
            fieldSizes: {},
          },
        });

        const client = new QueryClient({
          defaultOptions: {
            queries: {
              retry: false,
            },
          },
        });

        return (
          <MemoryRouter>
            <Provider store={store}>
              <QueryClientProvider client={client}>
                <IntlProvider messages={{}} textComponent="span" locale="en">
                  <ThemeProvider theme={lightTheme}>
                    <NotificationsProvider>
                      <DndProvider backend={HTML5Backend}>{children}</DndProvider>
                    </NotificationsProvider>
                  </ThemeProvider>
                </IntlProvider>
              </QueryClientProvider>
            </Provider>
          </MemoryRouter>
        );
      },
    }
  ),
  user: userEvent.setup(),
});

/**
 * TODO: we should use MSW for network calls
 */
describe('EditSettingsView', () => {
  it('renders correctly', async () => {
    const { getByRole } = render();

    expect(getByRole('heading', { name: 'Configure the view - Address' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Back' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(getByRole('combobox', { name: 'Entry title' })).toBeInTheDocument();

    expect(getByRole('heading', { name: 'View' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'Edit the content type' })).toBeInTheDocument();

    mainLayout.layouts.edit.forEach((attributeRow) =>
      attributeRow.forEach((attribute) => {
        expect(getByRole('button', { name: `Edit ${attribute.name}` })).toBeInTheDocument();
        expect(getByRole('button', { name: `Delete ${attribute.name}` })).toBeInTheDocument();
      })
    );

    expect(getByRole('button', { name: 'Insert another field' })).toBeInTheDocument();
  });

  it('should add field and set it to disabled once all fields are showing', async () => {
    const { user, getByRole } = render();

    expect(getByRole('heading', { name: 'Configure the view - Address' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Insert another field' }));

    await user.click(getByRole('menuitem', { name: 'categories' }));

    mainLayout.layouts.edit.forEach((attributeRow) =>
      [...attributeRow, { name: 'categories' }].forEach((attribute) => {
        expect(getByRole('button', { name: `Edit ${attribute.name}` })).toBeInTheDocument();
        expect(getByRole('button', { name: `Delete ${attribute.name}` })).toBeInTheDocument();
      })
    );

    expect(getByRole('button', { name: 'Insert another field' })).toBeDisabled();

    fireEvent.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('dialog', { name: 'Confirmation' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Confirm' }));
  });

  it('should delete field', async () => {
    const { queryByRole, getByRole, user } = render();

    expect(getByRole('heading', { name: 'Configure the view - Address' })).toBeInTheDocument();

    expect(queryByRole('button', { name: 'Delete postal_code' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Delete postal_code' }));

    expect(queryByRole('button', { name: 'Delete postal_code' })).not.toBeInTheDocument();
    expect(queryByRole('button', { name: 'Edit postal_code' })).not.toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Save' }));

    expect(getByRole('dialog', { name: 'Confirmation' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Confirm' }));
  });
});
