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

const setup = (props) => ({
  ...render(<MarketPlacePage {...props} />, {
    wrapper({ children }) {
      const history = createMemoryHistory({
        initialEntries: ['/?npmPackageType=provider&sort=name:asc'],
      });
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

const waitForReload = async () => {
  await screen.findByTestId('marketplace-results');
};

describe('Marketplace page - providers tab', () => {
  beforeAll(() => server.listen());

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => server.close());

  it('renders the providers tab', async () => {
    const { getByText, getByRole, queryByText } = setup();

    await waitForReload();

    const providersTab = getByText(/providers/i).closest('button');
    const tabPanel = getByRole('tabpanel');
    const providerCardText = within(tabPanel).getByText('Cloudinary');
    const pluginCardText = within(tabPanel).queryByText('Comments');
    const submitProviderText = queryByText('Submit provider');

    expect(providersTab).toBeDefined();
    expect(providersTab).toHaveAttribute('aria-selected', 'true');
    expect(providerCardText).toBeVisible();
    expect(submitProviderText).toBeVisible();
    expect(pluginCardText).toEqual(null);
  });

  it('should return providers search results matching the query', async () => {
    const { getByText, getByPlaceholderText, user, queryByText } = setup();

    await waitForReload();

    const input = getByPlaceholderText('Search');
    await user.type(input, 'cloudina');

    await waitForReload();

    const match = getByText('Cloudinary');
    const notMatch = queryByText('Mailgun');
    const plugin = queryByText('Comments');

    expect(match).toBeVisible();
    expect(notMatch).toEqual(null);
    expect(plugin).toEqual(null);
  });

  it('should return empty providers search results given a bad query', async () => {
    const { getByText, getByPlaceholderText, user } = setup();

    await waitForReload();

    const input = getByPlaceholderText('Search');
    const badQuery = 'asdf';
    await user.type(input, badQuery);
    await waitForReload();
    const noResult = getByText(`No result for "${badQuery}"`);

    expect(noResult).toBeVisible();
  });

  it('shows the installed text for installed providers', async () => {
    const { getByRole, user } = setup();

    await waitForReload();

    // Open providers tab
    const providersTab = getByRole('tab', { name: /providers/i });
    await user.click(providersTab);

    // Provider that's already installed
    const alreadyInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Cloudinary'));
    const alreadyInstalledText = within(alreadyInstalledCard).queryByText(/installed/i);
    expect(alreadyInstalledText).toBeVisible();

    // Provider that's not installed
    const notInstalledCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Rackspace'));
    const notInstalledText = within(notInstalledCard).queryByText(/copy install command/i);
    expect(notInstalledText).toBeVisible();
  });

  it('shows providers filters popover', async () => {
    const { getByRole, getByTestId, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');

    // Only show collections filters on providers
    const providersTab = getByRole('tab', { name: /providers/i });
    await user.click(providersTab);
    await user.click(filtersButton);

    expect(getByRole('combobox', { name: 'Collections' })).toBeVisible();
  });

  it('shows the collections filter options', async () => {
    const { getByRole, getByTestId, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const mockedServerCollections = {
      'Made by official partners': 0,
      'Made by Strapi': 6,
      'Made by the community': 2,
      Verified: 6,
    };

    Object.entries(mockedServerCollections).forEach(([collectionName, count]) => {
      const option = screen.getByTestId(`${collectionName}-${count}`);
      expect(option).toBeVisible();
    });
  });

  it('filters a collection option', async () => {
    const { getAllByTestId, getByRole, getByTestId, getByText, queryByText, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const option = getByTestId('Made by Strapi-6');
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

    const collectionPlugin = getByText('Amazon SES');
    const notCollectionPlugin = queryByText('Cloudinary');
    expect(collectionPlugin).toBeVisible();
    expect(notCollectionPlugin).toEqual(null);
  });

  it('filters multiple collection options', async () => {
    const { getAllByTestId, getByRole, getByTestId, getByText, queryByText, user } = setup();

    await waitForReload();

    await user.click(getByTestId('filters-button'));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByTestId('Made by Strapi-6'));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    await user.click(getByTestId('filters-button'));
    await user.click(getByRole('combobox', { name: `Collections` }));
    await user.click(getByRole('option', { name: `Verified (6)` }));
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
    expect(getByText('Amazon SES')).toBeVisible();
    expect(getByText('Nodemailer')).toBeVisible();
    expect(queryByText('Cloudinary')).toEqual(null);
  });

  it('removes a filter option tag', async () => {
    const { getByRole, getByTestId, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const option = getByTestId('Made by Strapi-6');
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
    // expect(history.location.search).toBe('?npmPackageType=provider&sort=name:asc&page=1');
  });

  it('only filters in the providers tab', async () => {
    const { getAllByTestId, getByRole, getByTestId, findAllByTestId, findByText, user } = setup();

    await waitForReload();

    const filtersButton = getByTestId('filters-button');
    await user.click(filtersButton);

    const collectionsButton = getByRole('combobox', { name: 'Collections' });
    await user.click(collectionsButton);

    const option = getByTestId('Made by Strapi-6');
    await user.click(option);
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    const collectionCards = await findAllByTestId('npm-package-card');
    expect(collectionCards.length).toBe(2);

    await user.click((await findByText(/plugins/i)).closest('button'));

    const pluginCards = getAllByTestId('npm-package-card');
    expect(pluginCards.length).toBe(5);

    await user.click((await findByText(/providers/i)).closest('button'));
    expect(collectionCards.length).toBe(2);
  });

  it('shows the correct options on sort select', async () => {
    const { getByRole, user } = setup();

    await waitForReload();

    const sortButton = getByRole('combobox', { name: /Sort by/i });
    await user.click(sortButton);

    const alphabeticalOption = getByRole('option', { name: 'Alphabetical order' });
    const newestOption = getByRole('option', { name: 'Newest' });

    expect(alphabeticalOption).toBeVisible();
    expect(newestOption).toBeVisible();
  });

  it('changes the url on sort option select', async () => {
    const { getByRole, user } = setup();

    await waitForReload();

    const sortButton = getByRole('combobox', { name: /Sort by/i });
    await user.click(sortButton);

    const newestOption = getByRole('option', { name: 'Newest' });
    await user.click(newestOption);

    // expect(history.location.search).toEqual(
    //   '?npmPackageType=provider&sort=submissionDate:desc&page=1'
    // );
  });

  it('shows github stars and weekly downloads count for each provider', async () => {
    const { getByRole, user } = setup();

    await waitForReload();

    const providersTab = getByRole('tab', { name: /providers/i });
    await user.click(providersTab);

    const cloudinaryCard = screen
      .getAllByTestId('npm-package-card')
      .find((div) => div.innerHTML.includes('Cloudinary'));

    const githubStarsLabel = within(cloudinaryCard).getByLabelText(
      /this provider was starred \d+ on GitHub/i
    );
    expect(githubStarsLabel).toBeVisible();

    const downloadsLabel = within(cloudinaryCard).getByLabelText(
      /this provider has \d+ weekly downloads/i
    );
    expect(downloadsLabel).toBeVisible();
  });

  it('paginates the results', async () => {
    const { getByText, getByLabelText, getAllByText, user } = setup();

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
    // expect(history.location.search).toBe('?npmPackageType=provider&sort=name:asc&page=2');

    // Can go to previous page
    await user.click(getByText(/go to previous page/i).closest('a'));
    await waitForReload();
    // expect(history.location.search).toBe('?npmPackageType=provider&sort=name:asc&page=1');

    // Can go to specific page
    await user.click(getByText(/go to page 3/i).closest('a'));
    await waitForReload();
    // expect(history.location.search).toBe('?npmPackageType=provider&sort=name:asc&page=3');
  });
});
