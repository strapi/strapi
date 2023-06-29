import React from 'react';

import { fixtures } from '@strapi/admin-test-utils';
import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { TrackingProvider } from '@strapi/helper-plugin';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryHistory } from 'history';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import { createStore } from 'redux';

import MarketPlacePage from '../index';

import server from './server';

// Increase the jest timeout to accommodate long running tests
jest.setTimeout(50000);
const toggleNotification = jest.fn();
jest.mock('../../../hooks/useNavigatorOnLine', () => jest.fn(() => true));
jest.mock('../../../hooks/useDebounce', () => (value) => value);
jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useNotification: jest.fn(() => {
    return toggleNotification;
  }),
  CheckPagePermissions: ({ children }) => children,
  useAppInfo: jest.fn(() => ({
    autoReload: true,
    dependencies: {
      '@strapi/plugin-documentation': '4.2.0',
      '@strapi/provider-upload-cloudinary': '4.2.0',
    },
    useYarn: true,
  })),
}));

const waitForReload = async () => {
  await screen.findByTestId('marketplace-results');
};

const setup = (props) => ({
  ...render(<MarketPlacePage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory();
      const client = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      return (
        <Provider
          store={createStore((state) => state, {
            admin_app: { permissions: fixtures.permissions.app },
          })}
        >
          <QueryClientProvider client={client}>
            <TrackingProvider>
              <IntlProvider locale="en" messages={{}} textComponent="span">
                <ThemeProvider theme={lightTheme}>
                  <Router history={history}>{children}</Router>
                </ThemeProvider>
              </IntlProvider>
            </TrackingProvider>
          </QueryClientProvider>
        </Provider>
      );
    },
  }),

  user: userEvent.setup(),
});

describe('Marketplace page - plugins tab', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  it('renders the plugins tab', async () => {
    const { getByRole, getByText, queryByText } = setup();

    await waitForReload();

    // Make sure it defaults to the plugins tab
    const button = getByRole('tab', { selected: true });
    const pluginsTabActive = within(button).getByText(/plugins/i);

    const pluginCardText = getByText('Comments');
    const providerCardText = queryByText('Cloudinary');
    const submitPluginText = queryByText('Submit plugin');

    expect(pluginsTabActive).not.toBe(null);
    expect(pluginCardText).toBeVisible();
    expect(submitPluginText).toBeVisible();
    expect(providerCardText).toEqual(null);
  });

  it('should return plugin search results matching the query', async () => {
    const { getByPlaceholderText, getByText, queryByText, user } = setup();

    await waitForReload();

    const input = getByPlaceholderText('Search');

    await user.type(input, 'comment');
    await waitForReload();

    const match = getByText('Comments');
    const notMatch = queryByText('Sentry');
    const provider = queryByText('Cloudinary');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(provider).toEqual(null);
  });

  it('should return empty plugin search results given a bad query', async () => {
    const { getByPlaceholderText, getByText, user } = setup();

    await waitForReload();

    const input = getByPlaceholderText('Search');
    const badQuery = 'asdf';
    await user.type(input, badQuery);
    await waitForReload();

    const noResult = getByText(`No result for "${badQuery}"`);
    expect(noResult).toBeVisible();
  });

  it('shows the installed text for installed plugins', async () => {
    const { getAllByTestId } = setup();

    await waitForReload();

    // Plugin that's already installed
    const alreadyInstalledCard = getAllByTestId('npm-package-card').find((div) =>
      div.innerHTML.includes('Documentation')
    );
    const alreadyInstalledText = within(alreadyInstalledCard).queryByText(/installed/i);
    expect(alreadyInstalledText).toBeVisible();

    // Plugin that's not installed
    const notInstalledCard = getAllByTestId('npm-package-card').find((div) =>
      div.innerHTML.includes('Comments')
    );
    const notInstalledText = within(notInstalledCard).queryByText(/copy install command/i);
    expect(notInstalledText).toBeVisible();
  });

  it('shows plugins filters popover', async () => {
    const { getByTestId, getByRole, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    const categoriesButton = getByRole('combobox', { name: 'Categories' });

    expect(collectionsButton).toBeVisible();
    expect(categoriesButton).toBeVisible();
  });

  it('shows the collections filter options', async () => {
    const { getByTestId, getByRole, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const mockedServerCollections = {
      'Made by official partners': 9,
      'Made by Strapi': 13,
      'Made by the community': 69,
      Verified: 29,
    };

    Object.entries(mockedServerCollections).forEach(([collectionName, count]) => {
      const option = getByTestId(`${collectionName}-${count}`);
      expect(option).toBeVisible();
    });
  });

  it('shows the categories filter options', async () => {
    const { getByTestId, getByRole, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const categoriesButton = getByRole('combobox', { name: 'Categories' });
    await user.click(categoriesButton);

    const mockedServerCategories = {
      'Custom fields': 4,
      Deployment: 2,
      Monitoring: 1,
    };

    Object.entries(mockedServerCategories).forEach(([categoryName, count]) => {
      const option = getByTestId(`${categoryName}-${count}`);
      expect(option).toBeVisible();
    });
  });

  it('filters a collection option', async () => {
    const { getByTestId, getAllByTestId, getByText, queryByText, getByRole, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const option = getByTestId('Made by Strapi-13');
    await user.click(option);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');
    await waitForReload();

    const optionTag = getByRole('button', { name: 'Made by Strapi' });
    expect(optionTag).toBeVisible();

    const collectionCards = getAllByTestId('npm-package-card');
    expect(collectionCards.length).toEqual(2);

    const collectionPlugin = getByText('Gatsby Preview');
    const notCollectionPlugin = queryByText('Comments');
    expect(collectionPlugin).toBeVisible();
    expect(notCollectionPlugin).toEqual(null);
  });

  it('filters a category option', async () => {
    const { getByTestId, getAllByTestId, getByText, queryByText, getByRole, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const categoriesButton = getByRole('combobox', { name: 'Categories' });
    await user.click(categoriesButton);

    const option = getByTestId('Custom fields-4');
    await user.click(option);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');
    await waitForReload();

    const optionTag = getByRole('button', { name: 'Custom fields' });
    expect(optionTag).toBeVisible();

    const categoryCards = getAllByTestId('npm-package-card');
    expect(categoryCards.length).toEqual(2);

    const categoryPlugin = getByText('CKEditor 5 custom field');
    const notCategoryPlugin = queryByText('Comments');
    expect(categoryPlugin).toBeVisible();
    expect(notCategoryPlugin).toEqual(null);
  });

  it('filters a category and a collection option', async () => {
    const { getByTestId, getByRole, getAllByTestId, getByText, queryByText, user } = setup();

    await waitForReload();

    // When a user clicks the filters button
    await user.click(getByTestId('filters-button'));
    // They should see a select button for collections with no options selected
    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    // When they click the select button
    await user.click(collectionsButton);
    // They should see a Made by Strapi option
    const collectionOption = getByTestId('Made by Strapi-13');
    // When they click the option
    await user.click(collectionOption);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');
    await user.click(getByTestId('filters-button'));
    // They should see the collections button indicating 1 option selected
    expect(getByRole('combobox', { name: 'Collections' })).toHaveTextContent(
      '1 collection selected'
    );
    // They should the categories button with no options selected
    const categoriesButton = getByRole('combobox', { name: 'Categories' });
    await user.click(categoriesButton);
    const categoryOption = getByTestId('Custom fields-4');
    await user.click(categoryOption);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');
    // When the page reloads they should see a tag for the selected option
    await waitForReload();
    const madeByStrapiTag = getByRole('button', { name: 'Made by Strapi' });
    const customFieldsTag = getByRole('button', { name: 'Custom fields' });
    expect(madeByStrapiTag).toBeVisible();
    expect(customFieldsTag).toBeVisible();
    // They should see the correct number of results
    const filterCards = getAllByTestId('npm-package-card');
    expect(filterCards.length).toEqual(4);
    // They should see the collection option results
    const collectionPlugin = getByText('Gatsby Preview');
    const notCollectionPlugin = queryByText('Comments');
    expect(collectionPlugin).toBeVisible();
    expect(notCollectionPlugin).toEqual(null);
    // They should see the category option results
    const categoryPlugin = getByText('CKEditor 5 custom field');
    const notCategoryPlugin = queryByText('Config Sync');
    expect(categoryPlugin).toBeVisible();
    expect(notCategoryPlugin).toEqual(null);
  });

  it('filters multiple collection options', async () => {
    const { getByTestId, getByRole, getAllByTestId, getByText, queryByText, user } = setup();

    await waitForReload();

    await user.click(getByTestId('filters-button'));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByTestId('Made by Strapi-13'));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    await user.click(getByTestId('filters-button'));
    await user.click(getByRole('combobox', { name: `Collections` }));
    await user.click(getByRole('option', { name: `Verified (29)` }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    const madeByStrapiTag = getByRole('button', { name: 'Made by Strapi' });
    const verifiedTag = getByRole('button', { name: 'Verified' });
    expect(madeByStrapiTag).toBeVisible();
    expect(verifiedTag).toBeVisible();
    expect(getAllByTestId('npm-package-card').length).toEqual(3);
    expect(getByText('Gatsby Preview')).toBeVisible();
    expect(getByText('Config Sync')).toBeVisible();
    expect(queryByText('Comments')).toEqual(null);
  });

  it('filters multiple category options', async () => {
    const { getByTestId, getByRole, getAllByTestId, getByText, queryByText, user } = setup();

    await waitForReload();

    await user.click(getByTestId('filters-button'));
    await user.click(getByRole('combobox', { name: 'Categories' }));
    await user.click(getByRole('option', { name: `Custom fields (4)` }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    await user.click(getByTestId('filters-button'));
    await user.click(getByRole('combobox', { name: `Categories` }));
    await user.click(getByRole('option', { name: `Monitoring (1)` }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    const customFieldsTag = getByRole('button', { name: 'Custom fields' });
    const monitoringTag = getByRole('button', { name: 'Monitoring' });
    expect(customFieldsTag).toBeVisible();
    expect(monitoringTag).toBeVisible();
    expect(getAllByTestId('npm-package-card').length).toEqual(3);
    expect(getByText('CKEditor 5 custom field')).toBeVisible();
    expect(getByText('Sentry')).toBeVisible();
    expect(queryByText('Comments')).toEqual(null);
  });

  it('removes a filter option tag', async () => {
    const { getByTestId, getByRole, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const option = getByTestId('Made by Strapi-13');
    await user.click(option);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    const optionTag = getByRole('button', { name: 'Made by Strapi' });
    expect(optionTag).toBeVisible();

    await user.click(optionTag);

    expect(optionTag).not.toBeVisible();
    // expect(history.location.search).toBe('?page=1');
  });

  it('only filters in the plugins tab', async () => {
    const { getByTestId, getByRole, getAllByTestId, findAllByTestId, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const option = getByTestId('Made by Strapi-13');
    await user.click(option);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    const collectionCards = await findAllByTestId('npm-package-card');
    expect(collectionCards.length).toBe(2);

    await user.click(getByRole('tab', { name: /providers/i }));

    const providerCards = getAllByTestId('npm-package-card');
    expect(providerCards.length).toBe(9);

    await user.click(getByRole('tab', { name: /plugins/i }));
    expect(collectionCards.length).toBe(2);
  });

  it('shows the correct options on sort select', async () => {
    const { getByRole, user } = setup();

    await waitForReload();

    const sortButton = getByRole('combobox', { name: /Sort by/i });

    await user.click(sortButton);

    expect(getByRole('option', { name: 'Alphabetical order' })).toBeVisible();
    expect(getByRole('option', { name: 'Newest' })).toBeVisible();
  });

  it('changes the url on sort option select', async () => {
    const { getByRole, user } = setup();

    await waitForReload();

    const sortButton = getByRole('combobox', { name: /Sort by/i });
    await user.click(sortButton);

    await user.click(getByRole('option', { name: 'Newest' }));

    // expect(history.location.search).toEqual('?sort=submissionDate:desc&page=1');
  });

  it('shows github stars and weekly downloads count for each plugin', async () => {
    const { getAllByTestId } = setup();

    await waitForReload();

    const documentationCard = getAllByTestId('npm-package-card').find((div) =>
      div.innerHTML.includes('Documentation')
    );

    const githubStarsLabel = within(documentationCard).getByLabelText(
      /this plugin was starred \d+ on GitHub/i
    );

    expect(githubStarsLabel).toBeVisible();

    const downloadsLabel = within(documentationCard).getByLabelText(
      /this plugin has \d+ weekly downloads/i
    );
    expect(downloadsLabel).toBeVisible();
  });

  it('paginates the results', async () => {
    const { getByLabelText, getAllByText, getByText, user } = setup();

    await waitForReload();

    // Should have pagination section with 4 pages
    const pagination = getByLabelText(/pagination/i);
    expect(pagination).toBeVisible();
    const pageButtons = getAllByText(/go to page \d+/i).map((el) => el.closest('a'));
    expect(pageButtons.length).toBe(4);

    // Can't go to previous page since there isn't one
    expect(getByText(/go to previous page/i).closest('a')).toHaveAttribute('aria-disabled', 'true');

    // Can go to next page
    await user.click(getByText(/go to next page/i).closest('a'));
    await waitForReload();
    // expect(history.location.search).toBe('?page=2');

    // Can go to previous page
    await user.click(getByText(/go to previous page/i).closest('a'));
    await waitForReload();
    // expect(history.location.search).toBe('?page=1');

    // Can go to specific page
    await user.click(getByText(/go to page 3/i).closest('a'));
    await waitForReload();
    // expect(history.location.search).toBe('?page=3');
  });
});
