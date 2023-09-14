import React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render as renderRTL, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { combineReducers, createStore } from 'redux';

import reducers from '../../../../../../reducers';
import { FieldPicker } from '../index';

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

const render = () => ({
  ...renderRTL(<FieldPicker layout={layout} />, {
    wrapper({ children }) {
      const rootReducer = combineReducers(reducers);

      const store = createStore(rootReducer, {
        'content-manager_listView': {
          contentType: {
            attributes: {
              id: { type: 'integer' },
              name: { type: 'string' },
              createdAt: { type: 'datetime' },
              updatedAt: { type: 'datetime' },
            },
            metadatas: {
              id: {
                edit: {},
                list: { label: 'id', searchable: true, sortable: true },
              },
              name: {
                edit: {
                  label: 'name',
                  description: '',
                  placeholder: '',
                  visible: true,
                  editable: true,
                },
                list: { label: 'name', searchable: true, sortable: true },
              },
              createdAt: {
                edit: {
                  label: 'createdAt',
                  description: '',
                  placeholder: '',
                  visible: false,
                  editable: true,
                },
                list: { label: 'createdAt', searchable: true, sortable: true },
              },
              updatedAt: {
                edit: {
                  label: 'updatedAt',
                  description: '',
                  placeholder: '',
                  visible: false,
                  editable: true,
                },
                list: { label: 'updatedAt', searchable: true, sortable: true },
              },
            },
          },
          displayedHeaders: [
            {
              key: '__id_key__',
              name: 'id',
              fieldSchema: { type: 'integer' },
              metadatas: { label: 'id', searchable: true, sortable: true },
            },
          ],
          initialDisplayedHeaders: [
            {
              key: '__id_key__',
              name: 'id',
              fieldSchema: { type: 'integer' },
              metadatas: { label: 'id', searchable: true, sortable: true },
            },
          ],
        },
      });

      return (
        <IntlProvider messages={{}} textComponent="span" locale="en">
          <ThemeProvider theme={lightTheme}>
            <Provider store={store}>{children}</Provider>
          </ThemeProvider>
        </IntlProvider>
      );
    },
  }),
});

describe('FieldPicker', () => {
  it('should contains all the headers', () => {
    const { getAllByRole, getByRole } = render();

    const checkboxes = getAllByRole('checkbox');
    const { attributes } = layout.contentType;
    const attributesKeys = Object.keys(attributes);

    expect(checkboxes.length).toBe(attributesKeys.length);

    // eslint-disable-next-line no-restricted-syntax
    for (let attributeKey of attributesKeys) {
      // for each attribute make sure you have a checkbox
      const checkbox = getByRole('checkbox', {
        name: attributeKey,
      });

      expect(checkbox).toBeInTheDocument();
    }
  });

  it('should contains the initially selected headers', () => {
    const { getByRole } = render();

    const checkboxSelected = getByRole('checkbox', {
      name: 'id',
    });
    const checkboxNotSelected = getByRole('checkbox', {
      name: 'name',
    });

    expect(checkboxSelected).toHaveAttribute('checked');
    expect(checkboxNotSelected).not.toHaveAttribute('checked');
  });

  it('should select an header', async () => {
    const { getByRole } = render();

    // User can toggle selected headers
    const checkboxIdHeader = getByRole('checkbox', { name: 'id' });
    const checkboxNameHeader = getByRole('checkbox', { name: 'name' });
    expect(checkboxIdHeader).toBeChecked();

    // User can unselect headers
    fireEvent.click(checkboxIdHeader);

    expect(checkboxIdHeader).not.toBeChecked();

    // User can select headers
    expect(checkboxNameHeader).not.toBeChecked();

    fireEvent.click(checkboxNameHeader);

    expect(checkboxNameHeader).toBeChecked();
  });

  it('should show inside the Popover the reset button and when clicked select the initial headers selected', async () => {
    const { getByRole } = render();

    // select a new header
    const checkboxNameHeader = getByRole('checkbox', { name: 'name' });
    fireEvent.click(checkboxNameHeader);

    expect(checkboxNameHeader).toBeChecked();

    const resetBtn = getByRole('button', {
      name: 'Reset',
    });
    fireEvent.click(resetBtn);

    expect(checkboxNameHeader).not.toBeChecked();
  });
});
