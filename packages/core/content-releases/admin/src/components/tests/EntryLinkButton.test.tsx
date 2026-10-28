import { useAuth } from '@strapi/admin/strapi-admin';
import { render, screen } from '@tests/utils';

import { EntryLinkButton } from '../EntryLinkButton';

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useAuth: jest.fn(),
}));

const readArticles = (locales?: string[]) => [
  {
    action: 'plugin::content-manager.explorer.read',
    subject: 'api::article.article',
    properties: locales ? { locales } : {},
  },
];

const mockPermissions = (permissions: unknown[]) => {
  jest
    .mocked(useAuth)
    .mockImplementation((_name, selector) =>
      (selector as (state: { permissions: unknown[] }) => unknown)({ permissions })
    );
};

const defaultProps = {
  contentTypeUid: 'api::article.article' as const,
  kind: 'collectionType' as const,
  documentId: 'doc-1',
  locale: 'fr',
};

describe('EntryLinkButton', () => {
  it('links to the entry in its locale', () => {
    mockPermissions(readArticles(['fr']));

    render(<EntryLinkButton {...defaultProps} />);

    expect(screen.getByRole('link', { name: 'Open entry' })).toHaveAttribute(
      'href',
      '/content-manager/collection-types/api::article.article/doc-1?plugins%5Bi18n%5D%5Blocale%5D=fr'
    );
  });

  it('links a single type to its edit view', () => {
    mockPermissions(readArticles());

    render(<EntryLinkButton {...defaultProps} kind="singleType" locale={null} />);

    expect(screen.getByRole('link', { name: 'Open entry' })).toHaveAttribute(
      'href',
      '/content-manager/single-types/api::article.article'
    );
  });

  it("isn't shown to a user who can't read the entry in that locale", () => {
    mockPermissions(readArticles(['en']));

    render(<EntryLinkButton {...defaultProps} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it("isn't shown to a user who can't read the content type", () => {
    mockPermissions([]);

    render(<EntryLinkButton {...defaultProps} locale={null} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
