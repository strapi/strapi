import { act, fireEvent } from '@testing-library/react';
import { render, screen, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { createTeamsFormFields } from '../../../../../../../tests/formFields';
import { ModalForm } from '../NewUserForm';

const UNSAVED_MESSAGE =
  'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.';

/**
 * The open modal sets `pointer-events: none` on the body, so `user.click` refuses to click it.
 * Radix attaches its document listener on a `setTimeout(…, 0)` once the layer mounts.
 */
const clickOutside = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  fireEvent.pointerDown(document.documentElement);
};

const setup = () => {
  const onToggle = jest.fn();
  const utils = render(<ModalForm onToggle={onToggle} />);

  return { ...utils, onToggle };
};

describe('ModalForm (invite user)', () => {
  it('closes on Escape while untouched', async () => {
    const { user, onToggle } = setup();

    await screen.findByRole('textbox', { name: 'First name' });
    await user.keyboard('[Escape]');

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(UNSAVED_MESSAGE)).not.toBeInTheDocument();
  });

  it('asks for confirmation on an outside click once a field is edited', async () => {
    const { user, onToggle } = setup();

    await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Kai');
    await clickOutside();

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(UNSAVED_MESSAGE);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('closes once the confirmation is accepted', async () => {
    const { user, onToggle } = setup();

    await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Kai');
    await user.keyboard('[Escape]');
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));

    await waitFor(() => expect(onToggle).toHaveBeenCalledTimes(1));
  });

  it('asks for confirmation from the Cancel button once a field is edited', async () => {
    const { user, onToggle } = setup();

    await user.type(await screen.findByRole('textbox', { name: 'First name' }), 'Kai');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('alertdialog')).toHaveTextContent(UNSAVED_MESSAGE);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('lets a plugin replace the roles field and sends its values with the invite', async () => {
    const bodies: unknown[] = [];

    server.use(
      http.post('/admin/users', async ({ request }) => {
        bodies.push(await request.json());

        return HttpResponse.json({ data: { id: 3, registrationToken: 'token' } });
      })
    );

    render(<ModalForm onToggle={jest.fn()} />, {
      providerOptions: {
        formFields: createTeamsFormFields('user', { replaces: ['roles'] }),
      },
    });

    fireEvent.change(await screen.findByRole('textbox', { name: 'First name' }), {
      target: { value: 'Kai' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'kai@doe.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Teams of new: null' }));

    expect(screen.queryByRole('combobox', { name: "User's roles" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Invite user' }));

    await waitFor(() =>
      expect(bodies).toEqual([
        expect.objectContaining({ roles: [], plugins: { teams: { teams: ['blue'] } } }),
      ])
    );
  });
});
