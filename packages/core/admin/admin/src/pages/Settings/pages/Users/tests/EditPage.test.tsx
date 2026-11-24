import { fireEvent, render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { createTeamsFormFields, teamsFieldMounted } from '../../../../../../tests/formFields';
import { EditPage } from '../EditPage';

describe('Users | EditPage', () => {
  it('should render', async () => {
    const { user } = render(<EditPage />, {
      initialEntries: ['/settings/users/1'],
    });

    await waitFor(() => expect(screen.queryByText('Loading content.')).not.toBeInTheDocument());

    await screen.findByRole('heading', { name: 'Edit John Doe' });

    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /User's role/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'First name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Last name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument();

    expect(screen.getByRole('checkbox', { name: 'Active' })).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: "User's roles" })).toBeInTheDocument();

    await user.click(screen.getByRole('combobox', { name: "User's roles" }));

    await screen.findByRole('option', { name: 'Editor' });
  });

  it('lets a plugin replace the roles field and sends its values with the user', async () => {
    const bodies: unknown[] = [];

    server.use(
      http.get('/admin/users/1', () =>
        HttpResponse.json({
          data: {
            id: 1,
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@doe.com',
            isActive: true,
            roles: [{ id: 1, code: 'strapi-editor', name: 'Editor' }],
          },
        })
      ),
      http.put('/admin/users/1', async ({ request }) => {
        bodies.push(await request.json());

        return HttpResponse.json({ data: { id: 1 } });
      })
    );

    teamsFieldMounted.mockClear();
    const { user } = render(<EditPage />, {
      initialEntries: ['/settings/users/1'],
      providerOptions: {
        formFields: createTeamsFormFields('user', { replaces: ['roles'] }),
      },
    });

    await user.click(await screen.findByRole('button', { name: 'Teams of 1: null' }));

    expect(screen.queryByRole('combobox', { name: "User's roles" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(bodies).toEqual([
        expect.objectContaining({ roles: [], plugins: { teams: { teams: ['blue'] } } }),
      ])
    );
    // After the save, the field remounts with no value, to load its saved values again
    expect(await screen.findByRole('button', { name: 'Teams of 1: null' })).toBeInTheDocument();
    expect(teamsFieldMounted).toHaveBeenCalledTimes(2);
  });
});
