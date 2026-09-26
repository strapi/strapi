/**
 * Reproduction for https://github.com/strapi/strapi/issues/27248
 *
 * A required relation keeps its "<field> must be defined." validation error — the error the
 * server returns and `DocumentActions` writes into form state with
 * `setErrors(formatValidationErrors(res.error))` after a rejected save/publish — even after the
 * user connects a relation, because the value change lands on `<field>.connect` while the error
 * lives at `<field>`, and the shared Form reducer never clears errors on `SET_FIELD_VALUE`.
 */
import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { RelationsInput } from '../Relations';

const REQUIRED_ERROR = 'relations must be defined.';

const render = () =>
  renderRTL(
    // `initialErrors` reproduces the state left behind by a rejected publish: the server-side
    // validation error keyed at the relation field path.
    <Form method="PUT" initialValues={{}} initialErrors={{ relations: REQUIRED_ERROR }}>
      {({ values }) => (
        <>
          <RelationsInput
            attribute={{
              type: 'relation',
              relation: 'manyToOne',
              target: 'api::category.category',
              inversedBy: 'relation_locales',
              // @ts-expect-error – this is what the API returns
              targetModel: 'api::category.category',
              relationType: 'manyToOne',
            }}
            label="relations"
            mainField={{ name: 'name', type: 'string' }}
            name="relations"
            type="relation"
            required
            id="12345"
            model="api::address.address"
            isRelatedToCurrentDocument
          />
          <div data-testid="form-values">{JSON.stringify(values)}</div>
        </>
      )}
    </Form>,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Routes>
            <Route path="/content-manager/:collectionType/:slug/:id" element={children} />
          </Routes>
        ),
      },
      initialEntries: ['/content-manager/collection-types/api::address.address/12345'],
    }
  );

describe('Relations – required relation keeps a stale validation error (issue #27248)', () => {
  beforeEach(() => {
    // The relation is empty, so only one entry is available to connect.
    server.use(
      http.get('/content-manager/relations/:model/:fieldName', () =>
        HttpResponse.json({
          results: [
            {
              id: 7,
              documentId: 'david-doe',
              locale: 'en',
              status: 'draft',
              name: 'David Doe',
            },
          ],
          pagination: { page: 1, pageCount: 1, total: 1 },
        })
      )
    );
  });

  it('clears the required-relation error as soon as a relation is connected', async () => {
    const { user } = render();

    // Pre-condition: the error left behind by the rejected publish is on screen.
    expect(await screen.findByText(REQUIRED_ERROR)).toBeInTheDocument();

    // The user fills the relation the normal way.
    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /David Doe/ }));

    // The change really landed in form state, at `relations.connect`.
    await waitFor(() => {
      expect(screen.getByTestId('form-values')).toHaveTextContent('"connect"');
    });
    // eslint-disable-next-line no-console
    console.log('form values after connect:', screen.getByTestId('form-values').textContent);

    // Reported expectation: the error should be gone now, without another save/publish.
    expect(screen.queryByText(REQUIRED_ERROR)).not.toBeInTheDocument();
  });
});
