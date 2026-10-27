import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { ListView } from '../../../pages/Settings/pages/ApiTokens/ListView';
import { registerListExtension } from '../extensions';

registerListExtension('api-tokens', () => ({
  column: { label: { id: 'space', defaultMessage: 'Space' }, field: 'space.name' },
  filter: {
    name: 'space',
    label: 'Space',
    type: 'enumeration',
    options: [{ label: 'Space A', value: 'a' }],
  },
}));

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
