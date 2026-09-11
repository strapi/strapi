import { render, screen, waitFor } from '@strapi/admin/strapi-admin/test';
import { userEvent } from '@testing-library/user-event';

import { SchemaSwitcher } from '../SchemaSwitcher';

const contentType = (uid: string, displayName: string, kind = 'collectionType') => ({
  uid,
  kind,
  modelType: 'contentType',
  visible: true,
  info: { displayName },
  attributes: [],
});

const component = (uid: string, displayName: string, category: string) => ({
  uid,
  modelType: 'component',
  category,
  info: { displayName },
  attributes: [],
});

const contentTypes = {
  'api::article.article': contentType('api::article.article', 'Article'),
  'api::author.author': contentType('api::author.author', 'Author'),
  'api::homepage.homepage': contentType('api::homepage.homepage', 'Homepage', 'singleType'),
  'api::hidden.hidden': { ...contentType('api::hidden.hidden', 'Hidden'), visible: false },
};

const components = {
  'basic.seo': component('basic.seo', 'Seo', 'basic'),
};

jest.mock('../../DataManager/useDataManager', () => ({
  useDataManager: jest.fn(() => ({ contentTypes, components })),
}));

const open = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: 'Go to another content type or component' }));
};

describe('SchemaSwitcher', () => {
  it('says where you are, and links the kind back to its tab', () => {
    render(<SchemaSwitcher current={contentTypes['api::article.article'] as never} />);

    expect(screen.getByText('Article')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Collection types' })).toHaveAttribute(
      'href',
      '/plugins/content-type-builder?kind=collectionType'
    );
  });

  it('names the kind of a single type, not the default one', () => {
    render(<SchemaSwitcher current={contentTypes['api::homepage.homepage'] as never} />);

    expect(screen.getByRole('link', { name: 'Single types' })).toBeInTheDocument();
  });

  /**
   * The sidebar's one real job. Every kind is listed, so the move from a
   * content type to a component does not go through the index.
   */
  it('lists every kind, grouped, with the current one marked', async () => {
    const user = userEvent.setup();
    render(<SchemaSwitcher current={contentTypes['api::article.article'] as never} />);

    await open(user);

    expect(await screen.findByRole('button', { name: /Author/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Homepage/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Seo/ })).toBeInTheDocument();
    // A content type the builder hides is not somewhere you can go.
    expect(screen.queryByRole('button', { name: /Hidden/ })).not.toBeInTheDocument();
  });

  it('narrows the list as you type', async () => {
    const user = userEvent.setup();
    render(<SchemaSwitcher current={contentTypes['api::article.article'] as never} />);

    await open(user);
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search content types and components' }),
      'seo'
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Author/ })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Seo/ })).toBeInTheDocument();
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    render(<SchemaSwitcher current={contentTypes['api::article.article'] as never} />);

    await open(user);
    await user.type(
      await screen.findByRole('searchbox', { name: 'Search content types and components' }),
      'zzz'
    );

    expect(await screen.findByText('Nothing matches that.')).toBeInTheDocument();
  });
});
