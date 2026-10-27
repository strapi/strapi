import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';

import { EditView } from '../../../pages/Settings/pages/ApiTokens/EditView/EditViewPage';
import { ListView } from '../../../pages/Settings/pages/ApiTokens/ListView';
import { CreatePage } from '../../../pages/Settings/pages/Roles/CreatePage';
import { registerFormFields, registerListExtension } from '../extensions';

registerListExtension('api-tokens', () => ({
  column: { label: { id: 'space', defaultMessage: 'Space' }, field: 'space.name' },
  filter: {
    name: 'space',
    label: 'Space',
    type: 'enumeration',
    options: [{ label: 'Space A', value: 'a' }],
  },
}));

registerFormFields('api-token', {
  pluginId: 'spaces',
  useFields: () => [
    {
      name: 'space',
      label: { id: 'space', defaultMessage: 'Space' },
      type: 'enumeration',
      options: [{ label: 'Space A', value: 'a' }],
      size: 6,
    },
  ],
});

registerFormFields('role', {
  pluginId: 'spaces',
  useFields: () => [
    {
      name: 'spaces',
      label: { id: 'spaces', defaultMessage: 'Spaces' },
      placeholder: { id: 'every-space', defaultMessage: 'Every space' },
      type: 'multi-select',
      options: [
        { label: 'Space A', value: 'a' },
        { label: 'Space B', value: 'b' },
      ],
      size: 6,
    },
  ],
});

describe('list extensions', () => {
  afterEach(() => server.restoreHandlers());

  it('renders the column from the row and sends the filter in the list query', async () => {
    const queries: URLSearchParams[] = [];
    server.use(
      http.get('/admin/api-tokens', ({ request }) => {
        queries.push(new URL(request.url).searchParams);

        return HttpResponse.json({
          data: [
            {
              id: '1',
              name: 'My token',
              kind: 'content-api',
              type: 'read-only',
              createdAt: '2021-11-15T00:00:00.000Z',
              permissions: [],
              space: { name: 'Space A' },
            },
          ],
        });
      })
    );

    const { user } = render(<ListView />, { initialEntries: ['/settings/api-tokens'] });

    expect(await screen.findByRole('gridcell', { name: 'Space A' })).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: 'Space' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(await screen.findByRole('combobox', { name: 'Space' }));
    await user.click(await screen.findByRole('option', { name: 'Space A' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add filter' }));

    await waitFor(() => expect(queries.at(-1)?.get('filters[$and][0][space][$eq]')).toBe('a'));
  });
});

describe('form fields', () => {
  afterEach(() => server.restoreHandlers());

  it('renders the fields and sends their values under plugins.<pluginId>', async () => {
    let body: unknown;
    server.use(
      http.post('/admin/api-tokens', async ({ request }) => {
        body = await request.json();

        // Refused, so the page stays on the form instead of opening the new token
        return HttpResponse.json(
          { error: { status: 400, name: 'ApplicationError', message: 'Refused' } },
          { status: 400 }
        );
      })
    );

    const { user } = render(<EditView />, { initialEntries: ['/settings/api-tokens/create'] });

    await user.click(await screen.findByRole('combobox', { name: 'Token duration' }));
    await user.click(await screen.findByRole('option', { name: '7 days' }));
    await user.click(screen.getByRole('combobox', { name: 'Token type' }));
    await user.click(await screen.findByRole('option', { name: 'Read-only' }));
    await user.click(screen.getByRole('combobox', { name: 'Space' }));
    await user.click(await screen.findByRole('option', { name: 'Space A' }));
    // Typed last: the form reinitialises while the permissions load
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'My token');
    // A click on Save does not submit the form in jsdom
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);

    await waitFor(() => expect(body).toMatchObject({ plugins: { spaces: { space: 'a' } } }));
  });

  it('renders the role fields on the duplicate page, with the values of the source role', async () => {
    let body: unknown;
    server.use(
      http.get('/admin/roles/1', () =>
        HttpResponse.json({
          data: { id: 1, name: 'Editor', plugins: { spaces: { spaces: ['a'] } } },
        })
      ),
      http.post('/admin/roles', async ({ request }) => {
        body = await request.json();

        return HttpResponse.json(
          { error: { status: 400, name: 'ApplicationError', message: 'Refused' } },
          { status: 400 }
        );
      })
    );

    const { user } = render(
      <Routes>
        <Route path="/settings/roles/duplicate/:id" element={<CreatePage />} />
      </Routes>,
      { initialEntries: ['/settings/roles/duplicate/1'] }
    );

    // The plugin's placeholder reaches the input
    expect(await screen.findByText('Every space')).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: 'Spaces' }));
    await user.click(await screen.findByRole('option', { name: 'Space B' }));
    await user.keyboard('{Escape}');
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Copy');
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);

    // Space A comes from the source role
    await waitFor(() =>
      expect(body).toMatchObject({ plugins: { spaces: { spaces: ['a', 'b'] } } })
    );
  });
});
