import { render, screen } from '@tests/utils';

import { LocaleListCell } from '../LocaleListCell';

/**
 * @note Because the `useDocument` hook access the contentManagerApi, we need to unfortunately mock it.
 * It'd be good to export an FE rendering wrapper that would work for plugins...
 */
jest.mock('@strapi/content-manager/strapi-admin', () => ({
  ...jest.requireActual('@strapi/content-manager/strapi-admin'),
  unstable_useDocument: jest.fn(() => ({
    meta: {
      availableLocales: [
        { locale: 'en', status: 'draft' },
        { locale: 'fr', status: 'published' },
        { locale: 'de', status: 'draft' },
        { locale: 'es', status: 'published' },
      ],
    },
  })),
}));

describe('LocaleListCell', () => {
  it('renders a button with all the names of the locales that are available for the document when there are 2 or fewer locales', async () => {
    render(
      <LocaleListCell
        localizations={[{ locale: 'en' }, { locale: 'fr' }]}
        locale="en"
        documentId="123"
      />
    );

    expect(await screen.findByText('English (default), Français')).toBeInTheDocument();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders a button with only the first 2 locales and "+ X more" text when there are more than 2 locales', async () => {
    render(
      <LocaleListCell
        localizations={[{ locale: 'en' }, { locale: 'fr' }, { locale: 'de' }, { locale: 'es' }]}
        locale="en"
        documentId="123"
      />
    );

    const button = await screen.findByText('Deutsch, English (default) + 2 more');
    expect(button).toBeInTheDocument();

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('renders a list of the locales available on the document when the button is clicked', async () => {
    const { user } = render(
      <LocaleListCell
        localizations={[{ locale: 'en' }, { locale: 'fr' }]}
        locale="en"
        documentId="123"
      />
    );

    expect(await screen.findByText('English (default), Français')).toBeInTheDocument();

    await user.click(screen.getByText('English (default), Français'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.getAllByRole('menuitem').at(0)).toHaveTextContent('English (default)');
    expect(screen.getAllByRole('menuitem').at(1)).toHaveTextContent('Français');
  });

  it('renders clickable menu items for each locale in the menu', async () => {
    const { user } = render(
      <LocaleListCell
        localizations={[{ locale: 'en' }, { locale: 'fr' }]}
        locale="en"
        documentId="123"
      />
    );

    const menuTrigger = await screen.findByText('English (default), Français');
    await user.click(menuTrigger);

    // Check that locale items are now menu items
    const englishMenuItem = screen.getByRole('menuitem', { name: 'English (default)' });
    const frenchMenuItem = screen.getByRole('menuitem', { name: 'Français' });

    expect(englishMenuItem).toBeInTheDocument();
    expect(frenchMenuItem).toBeInTheDocument();
  });
});
