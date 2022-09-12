import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import ListSettingsView from '../index';
import ModelsContext from '../../../contexts/ModelsContext';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(),
  useTracking: jest.fn(() => ({ trackUsage: jest.fn() })),
}));

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const layout = {
  attributes: {
    address: {
      type: 'relation',
    },
    averagePrice: {
      type: 'float',
    },
    cover: {
      type: 'media',
    },
    id: {
      type: 'integer',
    },
    since: {
      type: 'date',
    },
  },
  info: {
    displayName: 'michka',
  },
  metadatas: {
    address: {
      list: {
        label: '',
        sortable: false,
      },
    },
    averagePrice: {
      list: {
        label: 'AveragePrice',
        sortable: true,
      },
    },
    cover: {
      list: {
        label: 'michka',
        sortable: false,
      },
    },
    id: {
      list: {
        label: 'hey',
        sortable: true,
      },
    },
    since: {
      list: {
        label: 'since',
        sortable: false,
      },
    },
  },
  layouts: {
    list: ['id', 'address'],
  },
  options: {},
  settings: {
    bulkable: false,
    defaultSortBy: 'id',
    defaultSortOrder: 'ASC',
    filterable: true,
    pageSize: 10,
    searchable: true,
  },
  uid: 'api::restaurant.restaurant',
};

const makeApp = (history) => (
  <Router history={history}>
    <ModelsContext.Provider value={{ refetchData: jest.fn() }}>
      <QueryClientProvider client={client}>
        <IntlProvider messages={{ en: {} }} textComponent="span" locale="en">
          <ThemeProvider theme={lightTheme}>
            <DndProvider backend={HTML5Backend}>
              <ListSettingsView
                layout={layout}
                slug="api::restaurant.restaurant"
                updateLayout={jest.fn()}
              />
            </DndProvider>
          </ThemeProvider>
        </IntlProvider>
      </QueryClientProvider>
    </ModelsContext.Provider>
  </Router>
);

describe('ADMIN | CM | LV | Configure the view', () => {
  it('renders and matches the snapshot', async () => {
    const history = createMemoryHistory();

    const { container } = render(makeApp(history));
    await waitFor(() =>
      expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
    );

    expect(container).toMatchSnapshot();
  });

  it('should keep plugins query params when arriving on the page and going back', async () => {
    const history = createMemoryHistory();
    history.push(
      '/content-manager/collectionType/api::category.category/configurations/list?plugins[i18n][locale]=fr'
    );

    const { container } = render(makeApp(history));
    await waitFor(() =>
      expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
    );

    expect(history.location.search).toEqual('?plugins[i18n][locale]=fr');
    fireEvent.click(container.querySelector('#go-back'));
    expect(history.location.search).toEqual(
      '?page=1&pageSize=10&sort=id:ASC&plugins[i18n][locale]=fr'
    );
  });

  it('should add field', async () => {
    const history = createMemoryHistory();

    const { container } = render(makeApp(history));

    await waitFor(() =>
      expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
    );

    fireEvent.mouseDown(screen.getByTestId('add-field'));

    await waitFor(() => expect(screen.getByText('cover')).toBeInTheDocument());

    fireEvent.mouseDown(screen.getByText('cover'));
    fireEvent.mouseDown(screen.getByTestId('add-field'));

    expect(container).toMatchSnapshot();
  });

  it('should delete field', async () => {
    const history = createMemoryHistory();

    const { queryByTestId } = render(makeApp(history));
    await waitFor(() =>
      expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
    );

    expect(queryByTestId('delete-id')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-id'));

    expect(queryByTestId('delete-id')).not.toBeInTheDocument();
  });

  describe('Edit modal', () => {
    it('should open edit modal', async () => {
      const history = createMemoryHistory();

      render(makeApp(history));
      await waitFor(() =>
        expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
      );

      fireEvent.click(screen.getByLabelText('Edit address'));

      expect(
        screen.getByText("This value overrides the label displayed in the table's head")
      ).toBeInTheDocument();
    });

    it('should not show sortable toggle input if field not sortable', async () => {
      const history = createMemoryHistory();

      const { queryByText } = render(makeApp(history));
      await waitFor(() =>
        expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
      );

      fireEvent.click(screen.getByLabelText('Edit address'));

      expect(queryByText('Enable sort on this field')).not.toBeInTheDocument();
    });

    it('should show sortable toggle input if field sortable', async () => {
      const history = createMemoryHistory();

      const { queryByTestId } = render(makeApp(history));
      await waitFor(() =>
        expect(screen.getByText('Configure the view - Michka')).toBeInTheDocument()
      );

      fireEvent.click(screen.getByLabelText('Edit id'));

      expect(queryByTestId('Enable sort on this field')).toBeInTheDocument();
    });
  });
});
