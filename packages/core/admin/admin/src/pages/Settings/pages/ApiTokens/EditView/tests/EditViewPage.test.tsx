import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { createTeamsFormFields } from '../../../../../../../tests/formFields';
import { EditView } from '../EditViewPage';

describe('ADMIN | Pages | API TOKENS | EditView', () => {
  describe('create mode', () => {
    it('renders the create form with token type selector', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/create'],
      });

      await findByText('Name');
      await findByText('Description');
      await findByText('Token type');
    });
  });

  describe('edit mode — content-api token (id: 1)', () => {
    it('renders content permissions and token type selector', async () => {
      const { findByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/1'],
      });

      await findByText('My super token');
      await findByText('This describe my super token');
      await findByText('Regenerate');
      await findByText('Address');
      await findByText('Token type');
    });

    it('does not render admin permissions matrix', async () => {
      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/1'],
      });

      await findByText('My super token');
      expect(queryByText('Plugins and Settings')).not.toBeInTheDocument();
    });

    it('does not render content-api permissions section for content-api token', async () => {
      const { findByText, queryByText } = render(<EditView />, {
        initialEntries: ['/settings/api-tokens/1'],
      });

      await findByText('My super token');
      await waitFor(() => {
        expect(queryByText('Bound route to')).not.toBeInTheDocument();
      });
    });
  });

  it('sends the values of plugin fields with the token', async () => {
    const bodies: unknown[] = [];

    server.use(
      http.get('/admin/api-tokens/1', () =>
        HttpResponse.json({
          data: {
            id: '1',
            name: 'My super token',
            kind: 'content-api',
            type: 'read-only',
            lifespan: null,
            permissions: [],
          },
        })
      ),
      http.put('/admin/api-tokens/1', async ({ request }) => {
        bodies.push(await request.json());

        return HttpResponse.json({ data: { id: 1, name: 'My super token', type: 'read-only' } });
      })
    );

    const { user } = render(<EditView />, {
      initialEntries: ['/settings/api-tokens/1'],
      providerOptions: {
        formFields: createTeamsFormFields('content-api-token'),
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Teams of 1: null' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(bodies).toEqual([expect.objectContaining({ plugins: { teams: { teams: ['blue'] } } })])
    );
  });
});
