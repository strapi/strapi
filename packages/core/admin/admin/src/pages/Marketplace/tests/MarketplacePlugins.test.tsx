/* eslint-disable testing-library/no-node-access */
import { screen, within } from '@testing-library/react';
import { render as renderRTL, waitFor } from '@tests/utils';
import { useLocation } from 'react-router-dom';

import { MarketplacePage } from '../MarketplacePage';

jest.mock('../hooks/useNavigatorOnline');
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: jest.fn((value) => value),
}));

const waitForReload = async () => {
  await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());
};

const LocationDisplay = () => {
  const location = useLocation();

  return <span data-testId="location">{location.search}</span>;
};

const render = () =>
  renderRTL(<MarketplacePage />, {
    renderOptions: {
      wrapper({ children }) {
        return (
          <>
            {children}
            <LocationDisplay />
          </>
        );
      },
    },
  });

describe('Marketplace page - plugins tab', () => {
  it('renders the plugins tab', async () => {
    const { getByRole, getByText, queryByText } = render();

    await waitForReload();

    expect(getByRole('tab', { selected: true, name: /plugins/i })).toBeInTheDocument();
    expect(getByText('Comments')).toBeVisible();
    expect(queryByText('Cloudinary')).not.toBeInTheDocument();
    expect(getByRole('link', { name: 'Submit plugin' })).toBeVisible();
  });

  it('should return plugin search results matching the query', async () => {
    const { getByPlaceholderText, getByText, queryByText, user } = render();

    await waitForReload();

    await user.type(getByPlaceholderText('Search'), 'comment');
    await waitForReload();

    const match = getByText('Comments');
    const notMatch = queryByText('Sentry');
    const provider = queryByText('Cloudinary');

    expect(match).toBeVisible();
    expect(notMatch).not.toBeInTheDocument();
    expect(provider).not.toBeInTheDocument();
  });

  it('should return empty plugin search results given a bad query', async () => {
    const { getByPlaceholderText, findByText, user } = render();

    await waitForReload();

    const badQuery = 'asdf';
    await user.type(getByPlaceholderText('Search'), badQuery);
    await waitForReload();

    await findByText(`No result for "${badQuery}"`);
  });

  it('shows the installed text for installed plugins', async () => {
    const { getAllByTestId } = render();

    await waitForReload();

    // Plugin that's already installed
    const alreadyInstalledCard = getAllByTestId('npm-package-card').find((div) =>
      div.innerHTML.includes('Documentation')
    )!;
    const alreadyInstalledText = within(alreadyInstalledCard).queryByText(/installed/i);
    expect(alreadyInstalledText).toBeVisible();

    // Plugin that's not installed
    const notInstalledCard = getAllByTestId('npm-package-card').find((div) =>
      div.innerHTML.includes('Comments')
    )!;
    const notInstalledText = within(notInstalledCard).queryByText(/copy install command/i);
    expect(notInstalledText).toBeVisible();
  });

  it('shows plugins filters popover', async () => {
    const { getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));

    expect(getByRole('combobox', { name: 'Collections' })).toBeVisible();
    expect(getByRole('combobox', { name: 'Categories' })).toBeVisible();
  });

  it('shows the collections filter options', async () => {
    const { getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Collections' }));

    [
      'Made by official partners (9)',
      'Made by Strapi (13)',
      'Made by the community (69)',
      'Verified (29)',
    ].forEach((name) => {
      expect(getByRole('option', { name })).toBeVisible();
    });
  });

  it('shows the categories filter options', async () => {
    const { getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Categories' }));

    ['Custom fields (4)', 'Deployment (2)', 'Monitoring (1)'].forEach((name) => {
      expect(getByRole('option', { name })).toBeVisible();
    });
  });

  it('filters a collection option', async () => {
    const { getAllByTestId, getByText, queryByText, getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByRole('option', { name: 'Made by Strapi (13)' }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    expect(getByText('Made by Strapi')).toBeVisible();

    const collectionCards = getAllByTestId('npm-package-card');
    expect(collectionCards.length).toEqual(2);

    const collectionPlugin = getByText('Gatsby Preview');
    const notCollectionPlugin = queryByText('Comments');
    expect(collectionPlugin).toBeVisible();
    expect(notCollectionPlugin).not.toBeInTheDocument();
  });

  it('filters a category option', async () => {
    const { getAllByTestId, getByText, queryByText, getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Categories' }));
    await user.click(getByRole('option', { name: 'Custom fields (4)' }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');
    await waitForReload();

    const optionTag = getByText('Custom fields');
    expect(optionTag).toBeVisible();

    const categoryCards = getAllByTestId('npm-package-card');
    expect(categoryCards.length).toEqual(2);

    const categoryPlugin = getByText('CKEditor 5 custom field');
    const notCategoryPlugin = queryByText('Comments');
    expect(categoryPlugin).toBeVisible();
    expect(notCategoryPlugin).not.toBeInTheDocument();
  });

  it('filters a category and a collection option', async () => {
    const { getByRole, getAllByTestId, getByText, queryByText, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByRole('option', { name: 'Made by Strapi (13)' }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await user.click(getByRole('button', { name: 'Filters' }));
    // They should see the collections button indicating 1 option selected
    expect(getByRole('combobox', { name: 'Collections' })).toHaveTextContent(
      '1 collection selected'
    );
    // They should the categories button with no options selected
    await user.click(getByRole('combobox', { name: 'Categories' }));
    await user.click(getByRole('option', { name: 'Custom fields (4)' }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');
    // When the page reloads they should see a tag for the selected option
    await waitForReload();
    expect(getByText('Made by Strapi')).toBeVisible();
    expect(getByText('Custom fields')).toBeVisible();
    // They should see the correct number of results
    const filterCards = getAllByTestId('npm-package-card');
    expect(filterCards.length).toEqual(4);
    // They should see the collection option results
    const collectionPlugin = getByText('Gatsby Preview');
    const notCollectionPlugin = queryByText('Comments');
    expect(collectionPlugin).toBeVisible();
    expect(notCollectionPlugin).not.toBeInTheDocument();
    // They should see the category option results
    const categoryPlugin = getByText('CKEditor 5 custom field');
    const notCategoryPlugin = queryByText('Config Sync');
    expect(categoryPlugin).toBeVisible();
    expect(notCategoryPlugin).not.toBeInTheDocument();
  });

  it('filters multiple collection options', async () => {
    const { getByRole, getAllByTestId, getByText, queryByText, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByRole('option', { name: 'Made by Strapi (13)' }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: `Collections` }));
    await user.click(getByRole('option', { name: `Verified (29)` }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    expect(getByText('Made by Strapi')).toBeVisible();
    expect(getByText('Verified')).toBeVisible();
    expect(getAllByTestId('npm-package-card').length).toEqual(3);
    expect(getByText('Gatsby Preview')).toBeVisible();
    expect(getByText('Config Sync')).toBeVisible();
    expect(queryByText('Comments')).not.toBeInTheDocument();
  });

  it('filters multiple category options', async () => {
    const { getByRole, getAllByTestId, getByText, queryByText, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Categories' }));
    await user.click(getByRole('option', { name: `Custom fields (4)` }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: `Categories` }));
    await user.click(getByRole('option', { name: `Monitoring (1)` }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    expect(getByText('Custom fields')).toBeVisible();
    expect(getByText('Monitoring')).toBeVisible();
    expect(getAllByTestId('npm-package-card').length).toEqual(3);
    expect(getByText('CKEditor 5 custom field')).toBeVisible();
    expect(getByText('Sentry')).toBeVisible();
    expect(queryByText('Comments')).not.toBeInTheDocument();
  });

  it('removes a filter option tag', async () => {
    const { getByRole, getByText, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByRole('option', { name: 'Made by Strapi (13)' }));
    // Close the combobox
    await user.keyboard('[Escape]');
    // Close the popover
    await user.keyboard('[Escape]');

    await waitForReload();

    expect(screen.getByText('?collections[0]=Made by Strapi&page=1')).toBeInTheDocument();
    const removeButton = getByText('Made by Strapi').nextElementSibling;
    expect(removeButton).toBeInTheDocument();
    if (removeButton && removeButton?.tagName === 'BUTTON') {
      await user.click(removeButton);
      await waitForReload();
      expect(screen.getByTestId('location').textContent).toMatchInlineSnapshot(`"?page=1"`);
    }
  });

  it('only filters in the plugins tab', async () => {
    const { getByRole, getAllByTestId, findAllByTestId, user } = render();

    await waitForReload();

    await user.click(getByRole('button', { name: 'Filters' }));
    await user.click(getByRole('combobox', { name: 'Collections' }));
    await user.click(getByRole('option', { name: 'Made by Strapi (13)' }));
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
    const { getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('combobox', { name: /Sort by/i }));

    expect(getByRole('option', { name: 'Alphabetical order' })).toBeVisible();
    expect(getByRole('option', { name: 'Newest' })).toBeVisible();
  });

  it('changes the url on sort option select', async () => {
    const { getByRole, user } = render();

    await waitForReload();

    await user.click(getByRole('combobox', { name: /Sort by/i }));
    await user.click(getByRole('option', { name: 'Newest' }));

    await waitForReload();
    expect(screen.getByTestId('location').textContent).toMatchInlineSnapshot(
      `"?sort=submissionDate:desc&page=1"`
    );
  });

  it('shows github stars and weekly downloads count for each plugin', async () => {
    const { getAllByTestId } = render();

    await waitForReload();

    const documentationCard = getAllByTestId('npm-package-card').find((div) =>
      div.innerHTML.includes('Documentation')
    )!;

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
    const { getByLabelText, getAllByText, getByText, user } = render();

    await waitForReload();

    // Should have pagination section with 4 pages
    expect(getByLabelText(/pagination/i)).toBeVisible();
    expect(getAllByText(/go to page \d+/i).map((el) => el.closest('a'))).toHaveLength(4);

    // Can't go to previous page since there isn't one
    expect(getByText(/go to previous page/i).closest('a')).toHaveAttribute('aria-disabled', 'true');

    // Can go to next page
    await user.click(getByText(/go to next page/i).closest('a')!);
    await waitForReload();
    expect(screen.getByTestId('location').textContent).toMatchInlineSnapshot(
      `"?pageSize=24&page=2"`
    );

    // Can go to previous page
    await user.click(getByText(/go to previous page/i).closest('a')!);
    await waitForReload();
    expect(screen.getByTestId('location').textContent).toMatchInlineSnapshot(
      `"?pageSize=24&page=1"`
    );

    // Can go to specific page
    await user.click(getByText(/go to page 3/i).closest('a')!);
    await waitForReload();
    expect(screen.getByTestId('location').textContent).toMatchInlineSnapshot(
      `"?pageSize=24&page=3"`
    );
  });
});
