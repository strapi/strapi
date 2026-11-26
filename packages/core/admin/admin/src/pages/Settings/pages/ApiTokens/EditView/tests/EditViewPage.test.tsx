import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import {
  createTeamsFormFields,
  pluginValidationError,
  teamsFieldMounted,
} from '../../../../../../../tests/formFields';
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

    teamsFieldMounted.mockClear();
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
    // After the save, the field remounts with no value, to load its saved values again
    expect(await screen.findByRole('button', { name: 'Teams of 1: null' })).toBeInTheDocument();
    expect(teamsFieldMounted).toHaveBeenCalledTimes(2);
  });

  describe('plugin fields on create', () => {
    const renderCreate = () =>
      render(<EditView />, {
        initialEntries: ['/settings/api-tokens/create'],
        providerOptions: { formFields: createTeamsFormFields('content-api-token') },
      });

    const fillAndSave = async (user: ReturnType<typeof render>['user']) => {
      await user.click(await screen.findByRole('button', { name: 'Teams of new: null' }));
      await user.type(screen.getByRole('textbox', { name: /^Name/ }), 'New token');
      await user.click(screen.getByRole('combobox', { name: /^Token duration/ }));
      await user.click(screen.getByRole('option', { name: 'Unlimited' }));
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    };

    it('sends the values of plugin fields with the new token', async () => {
      const bodies: unknown[] = [];

      server.use(
        http.post('/admin/api-tokens', async ({ request }) => {
          bodies.push(await request.json());

          return HttpResponse.json({
            data: { id: 2, name: 'New token', type: 'read-only', accessKey: 'key' },
          });
        })
      );

      const { user } = renderCreate();
      await fillAndSave(user);

      await waitFor(() =>
        expect(bodies).toEqual([
          expect.objectContaining({ name: 'New token', plugins: { teams: { teams: ['blue'] } } }),
        ])
      );
    });

    it('shows a plugin error from the server on the plugin field only', async () => {
      server.use(
        http.post('/admin/api-tokens', () =>
          HttpResponse.json(pluginValidationError('teams', 'Pick a team'), { status: 400 })
        )
      );

      const { user } = renderCreate();
      await fillAndSave(user);

      expect(await screen.findByText('Teams error: Pick a team')).toBeInTheDocument();
      expect(screen.getAllByText(/Pick a team/)).toHaveLength(1);
    });
  });
});
