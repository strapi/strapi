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
      ],
    },
  })),
}));

describe('LocaleListCell', () => {
  it('renders a button with all the names of the locales that are available for the document', async () => {
    render(
      <LocaleListCell
        documentId="12345"
        collectionType="collection-types"
        locale="en"
        model="api::address.address"
      />
    );

    expect(
      await screen.findByRole('button', { name: 'English (default), Français' })
    ).toBeInTheDocument();

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('renders a list of the locales available on the document when the button is clicked', async () => {
    const { user } = render(
      <LocaleListCell
        documentId="12345"
        collectionType="collection-types"
        locale="en"
        model="api::address.address"
      />
    );

    expect(
      await screen.findByRole('button', { name: 'English (default), Français' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button'));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByRole('listitem').at(0)).toHaveTextContent('English (default)');
    expect(screen.getAllByRole('listitem').at(1)).toHaveTextContent('Français');
  });
});
