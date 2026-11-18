import { act, fireEvent } from '@testing-library/react';
import { render, screen, waitFor } from '@tests/utils';

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
});
