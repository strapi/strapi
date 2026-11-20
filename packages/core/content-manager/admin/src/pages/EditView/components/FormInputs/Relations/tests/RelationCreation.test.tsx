import { Form, useField } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { ComponentProvider } from '../../ComponentContext';
import { RelationsInput } from '../Relations';

const ConnectionProbe = ({ name }: { name: string }) => {
  const field = useField<{ connect?: Array<{ id: number }> }>(name);

  return (
    <output data-testid="connected-ids">
      {JSON.stringify(field.value?.connect?.map(({ id }) => id) ?? [])}
    </output>
  );
};

const renderRelation = (scope: 'root' | 'saved-component' | 'new-component' = 'root') => {
  const nested = scope !== 'root';
  const name = nested ? 'blocks.0.relatedCategory' : 'relations';
  const emptyRelation = { connect: [], disconnect: [] };
  const initialValues = nested
    ? { blocks: [{ relatedCategory: emptyRelation }] }
    : { relations: emptyRelation };

  server.use(
    http.get('/content-manager/relations/:model/:id/:fieldName', () =>
      HttpResponse.json({
        results: [],
        pagination: { page: 1, pageCount: 1, pageSize: 10, total: 0 },
      })
    ),
    http.get('/content-manager/relations/:model/:fieldName', ({ request }) => {
      const query = new URL(request.url).searchParams.get('_q') ?? '';
      const relation = {
        id: 1,
        documentId: 'existing-category',
        name: 'Existing category 1',
        status: 'published',
        locale: null,
      };
      const results = relation.name.toLowerCase().includes(query.toLowerCase()) ? [relation] : [];

      return HttpResponse.json({
        results,
        pagination: { page: 1, pageCount: 1, pageSize: 10, total: results.length },
      });
    })
  );

  const field = (
    <>
      <RelationsInput
        attribute={{
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::category.category',
          inversedBy: 'relation_locales',
          // @ts-expect-error - this is what the API returns
          targetModel: 'api::category.category',
          relationType: 'manyToMany',
        }}
        label="Category relations"
        mainField={{ name: 'name', type: 'string' }}
        name={name}
        type="relation"
      />
      <ConnectionProbe name={name} />
    </>
  );

  return renderRTL(
    nested ? (
      <ComponentProvider
        id={scope === 'saved-component' ? 99 : undefined}
        level={1}
        uid="blog.missing-component"
        type="dynamiczone"
      >
        {field}
      </ComponentProvider>
    ) : (
      field
    ),
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Routes>
            <Route
              path="/content-manager/:collectionType/:slug/:id"
              element={
                <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
                  {children}
                </Form>
              }
            />
          </Routes>
        ),
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/12345'],
    }
  );
};

describe('relation creation', () => {
  it.each([
    ['root', 'pointer'],
    ['saved-component', 'pointer'],
    ['new-component', 'pointer'],
    ['root', 'keyboard'],
    ['saved-component', 'keyboard'],
  ] as const)(
    'opens the creation modal from %s with the %s without connecting text',
    async (scope, interaction) => {
      const { user } = renderRelation(scope);
      const combobox = await screen.findByRole('combobox', { name: /Category relations/ });
      await user.click(combobox);
      await screen.findByRole('option', { name: /Existing category 1/ });
      await user.type(combobox, 'New category');
      await waitFor(() =>
        expect(
          screen.queryByRole('option', { name: /Existing category 1/ })
        ).not.toBeInTheDocument()
      );
      const createOption = await screen.findByText('Create a relation');
      if (interaction === 'pointer') {
        await user.click(createOption);
      } else {
        await user.keyboard('{ArrowDown}');
        expect(screen.getByRole('option', { name: 'Create a relation' })).toHaveAttribute(
          'data-highlighted'
        );
        await user.keyboard('{Enter}');
      }
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('connected-ids')).toHaveTextContent('[]');
      expect(
        screen.queryByText('An error occurred while trying to add the relation.')
      ).not.toBeInTheDocument();
    }
  );

  it.each(['root', 'saved-component'] as const)(
    'does not connect an existing numeric ID when creating a numeric label in %s',
    async (scope) => {
      const { user } = renderRelation(scope);
      const combobox = await screen.findByRole('combobox', { name: /Category relations/ });
      await user.type(combobox, '1');
      await screen.findByRole('option', { name: /Existing category 1/ });
      await user.click(await screen.findByText('Create a relation'));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('connected-ids')).toHaveTextContent('[]');
      await user.click(screen.getByRole('button', { name: 'Close modal' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.clear(combobox);
      await user.click(combobox);
      await user.click(await screen.findByRole('option', { name: /Existing category 1/ }));
      await waitFor(() => expect(screen.getByTestId('connected-ids')).toHaveTextContent('[1]'));
    }
  );

  it.each(['root', 'saved-component'] as const)(
    'still connects an existing relation in %s',
    async (scope) => {
      const { user } = renderRelation(scope);
      const combobox = await screen.findByRole('combobox', { name: /Category relations/ });
      await user.click(combobox);
      await user.click(await screen.findByRole('option', { name: /Existing category 1/ }));
      await waitFor(() => expect(screen.getByTestId('connected-ids')).toHaveTextContent('[1]'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }
  );

  it('can select an existing relation after cancelling creation with empty search text', async () => {
    const { user } = renderRelation();
    const combobox = await screen.findByRole('combobox', { name: /Category relations/ });
    await user.click(combobox);
    await user.click(await screen.findByText('Create a relation'));
    await screen.findByRole('dialog');
    expect(screen.getByTestId('connected-ids')).toHaveTextContent('[]');
    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(combobox);
    await user.click(await screen.findByRole('option', { name: /Existing category 1/ }));
    await waitFor(() => expect(screen.getByTestId('connected-ids')).toHaveTextContent('[1]'));
  });
});
