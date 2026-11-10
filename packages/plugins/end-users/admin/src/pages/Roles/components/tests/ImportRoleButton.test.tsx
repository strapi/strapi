import { fireEvent } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';

import { ImportRoleButton } from '../ImportRoleButton';

import type { RoleFile } from '../../../../../../shared/contracts/roles';

const LocationDisplay = () => <p data-testid="location">{useLocation().pathname}</p>;

const renderButton = () =>
  render(
    <>
      <Routes>
        <Route path="/settings/end-users/roles/*" element={<ImportRoleButton />} />
      </Routes>
      <LocationDisplay />
    </>,
    { initialEntries: ['/settings/end-users/roles'] }
  );

const ROLE_FILE: RoleFile = {
  version: 1,
  role: { name: 'Premium member', description: null, type: 'custom', requireTwoFactor: false },
  permissions: [],
};

/** Picks a file in the hidden input, as the browser's picker would */
const pick = (contents: string) => {
  const file = new File([contents], 'role.json', { type: 'application/json' });

  fireEvent.change(screen.getByLabelText('Role file'), { target: { files: [file] } });
};

/** Records what the import sends, and answers with `answer` */
const serveImport = (answer: () => Response) => {
  const sent: unknown[] = [];

  server.use(
    http.post('/end-users/roles/import', async ({ request }) => {
      sent.push(await request.json());

      return answer();
    })
  );

  return sent;
};

describe('ImportRoleButton', () => {
  it('creates a role from a role file and opens it', async () => {
    const sent = serveImport(() => HttpResponse.json({ data: { documentId: 'new-role' } }));
    renderButton();

    pick(JSON.stringify(ROLE_FILE));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/end-users/roles/new-role')
    );
    expect(sent).toEqual([ROLE_FILE]);
  });

  it('says a file that is not JSON is not a role file, and asks the server nothing', async () => {
    const sent = serveImport(() => HttpResponse.json({ data: { documentId: 'new-role' } }));
    renderButton();

    pick('this is not json');

    expect(
      await screen.findByText('That file is not a role file: it is not valid JSON.')
    ).toBeInTheDocument();
    expect(sent).toHaveLength(0);
    expect(screen.getByTestId('location')).toHaveTextContent('/settings/end-users/roles');
  });

  it("shows the server's refusal of a file and stays on the page", async () => {
    serveImport(() =>
      HttpResponse.json(
        {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'The role file has a permission for a content type this project does not have',
          },
        },
        { status: 400 }
      )
    );
    renderButton();

    pick(JSON.stringify(ROLE_FILE));

    expect(
      await screen.findByText(
        'The role file has a permission for a content type this project does not have'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/settings/end-users/roles');
  });

  it('forgets the chosen file, so the same one can be picked again after a fix', async () => {
    serveImport(() => HttpResponse.json({ data: { documentId: 'new-role' } }));
    renderButton();

    const input = screen.getByLabelText('Role file') as HTMLInputElement;

    pick('{');
    await screen.findByText('That file is not a role file: it is not valid JSON.');

    // The choice is forgotten, so picking a file again fires a change
    expect(input.value).toBe('');
  });
});
