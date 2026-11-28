import * as React from 'react';

import { Button, Modal, TextInput } from '@strapi/design-system';
import { act, render as renderRTL, within } from '@testing-library/react';
import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { Form, useField } from '../Form';
import { UnsavedChangesModal, useUnsavedChangesModalDirty } from '../UnsavedChangesModal';

const DirtyRegistrar = ({ isDirty }: { isDirty: boolean }) => {
  useUnsavedChangesModalDirty(isDirty);

  return null;
};

interface HarnessProps {
  isDirty?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Harness = ({ isDirty = false, open = true, onOpenChange = jest.fn() }: HarnessProps) => (
  <UnsavedChangesModal open={open} onOpenChange={onOpenChange}>
    <Modal.Content>
      <Modal.Header>
        <Modal.Title>Edit</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <TextInput aria-label="Name" defaultValue="" />
        <DirtyRegistrar isDirty={isDirty} />
      </Modal.Body>
      <Modal.Footer>
        <Modal.Close>
          <Button variant="tertiary">Cancel</Button>
        </Modal.Close>
      </Modal.Footer>
    </Modal.Content>
  </UnsavedChangesModal>
);

type User = ReturnType<typeof render>['user'];

/**
 * The open modal sets `pointer-events: none` on the body, so `user.click` refuses to click it.
 * Radix attaches its document listener on a `setTimeout(…, 0)` once the layer mounts, so let
 * that land first.
 */
const clickOutside = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

  fireEvent.pointerDown(document.documentElement);
};

/**
 * The modal is `aria-hidden` while the confirmation is open.
 */
const getModal = () => screen.getByRole('dialog', { name: 'Edit', hidden: true });

const getAlert = () => screen.queryByRole('alertdialog');

describe('UnsavedChangesModal', () => {
  describe('when there are no unsaved changes', () => {
    it('closes on Escape', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness onOpenChange={onOpenChange} />);

      await user.keyboard('[Escape]');

      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();
    });

    it('closes on an outside click', async () => {
      const onOpenChange = jest.fn();
      render(<Harness onOpenChange={onOpenChange} />);

      await clickOutside();

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();
    });

    it('closes from the header close button', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: 'Close modal' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();
    });

    it('closes from Modal.Close', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness onOpenChange={onOpenChange} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();
    });
  });

  describe('when there are unsaved changes', () => {
    it.each([
      ['Escape', async (user: User) => user.keyboard('[Escape]')],
      ['an outside click', async () => clickOutside()],
      [
        'the header close button',
        async (user: User) => user.click(screen.getByRole('button', { name: 'Close modal' })),
      ],
      [
        'Modal.Close',
        async (user: User) => user.click(screen.getByRole('button', { name: 'Cancel' })),
      ],
    ])('asks for confirmation on %s', async (_, dismiss) => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness isDirty onOpenChange={onOpenChange} />);

      await dismiss(user);

      expect(await screen.findByRole('alertdialog', { name: 'Confirmation' })).toBeInTheDocument();
      expect(
        screen.getByText(
          'You have unsaved changes. Are you sure you want to close? All your modifications will be lost.'
        )
      ).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(getModal()).toBeInTheDocument();
    });

    it('keeps the modal and its values when the confirmation is cancelled', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness isDirty onOpenChange={onOpenChange} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Draft');
      await user.keyboard('[Escape]');
      const alert = await screen.findByRole('alertdialog');
      await user.click(
        within(alert).getByRole('button', {
          name: 'Cancel',
        })
      );

      await waitFor(() => expect(getAlert()).not.toBeInTheDocument());
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(getModal()).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Draft');
    });

    it('closes the modal when the confirmation is accepted', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness isDirty onOpenChange={onOpenChange} />);

      await user.keyboard('[Escape]');
      await user.click(await screen.findByRole('button', { name: 'Confirm' }));

      expect(onOpenChange).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
      await waitFor(() => expect(getAlert()).not.toBeInTheDocument());
    });

    it('only closes the confirmation when Escape is pressed while it is open', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<Harness isDirty onOpenChange={onOpenChange} />);

      await user.keyboard('[Escape]');
      await screen.findByRole('alertdialog');
      await user.keyboard('[Escape]');

      await waitFor(() => expect(getAlert()).not.toBeInTheDocument());
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(getModal()).toBeInTheDocument();
    });

    it('does not ask when the parent closes the modal itself', async () => {
      const onOpenChange = jest.fn();
      const { rerender } = render(<Harness isDirty onOpenChange={onOpenChange} />);

      rerender(<Harness isDirty open={false} onOpenChange={onOpenChange} />);

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(getAlert()).not.toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('closes immediately once the changes are reverted', async () => {
      const onOpenChange = jest.fn();
      const { rerender, user } = render(<Harness isDirty onOpenChange={onOpenChange} />);

      rerender(<Harness isDirty={false} onOpenChange={onOpenChange} />);
      await user.keyboard('[Escape]');

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();
    });
  });

  describe('hasUnsavedChanges', () => {
    const PropHarness = ({
      hasUnsavedChanges,
      onOpenChange,
    }: {
      hasUnsavedChanges: boolean;
      onOpenChange: (open: boolean) => void;
    }) => (
      <UnsavedChangesModal open onOpenChange={onOpenChange} hasUnsavedChanges={hasUnsavedChanges}>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Edit</Modal.Title>
          </Modal.Header>
        </Modal.Content>
      </UnsavedChangesModal>
    );

    it('asks for confirmation when true', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<PropHarness hasUnsavedChanges onOpenChange={onOpenChange} />);

      await user.keyboard('[Escape]');

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('closes immediately when false', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(
        <PropHarness hasUnsavedChanges={false} onOpenChange={onOpenChange} />
      );

      await user.keyboard('[Escape]');

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();
    });
  });

  it('passes opening through untouched', async () => {
    const onOpenChange = jest.fn();
    const { user } = render(
      <UnsavedChangesModal open={false} onOpenChange={onOpenChange}>
        <Modal.Trigger>
          <Button>Open</Button>
        </Modal.Trigger>
        <Modal.Content>
          <Modal.Header>
            <Modal.Title>Edit</Modal.Title>
          </Modal.Header>
          <DirtyRegistrar isDirty />
        </Modal.Content>
      </UnsavedChangesModal>
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  describe('with a Strapi Form inside', () => {
    const NameField = () => {
      const field = useField<string>('name');

      return (
        <TextInput
          aria-label="Name"
          name="name"
          value={field.value ?? ''}
          onChange={field.onChange}
        />
      );
    };

    const FormHarness = ({
      onOpenChange,
      onSubmit = jest.fn(),
    }: {
      onOpenChange: (open: boolean) => void;
      onSubmit?: () => Promise<void> | void;
    }) => (
      <UnsavedChangesModal open onOpenChange={onOpenChange}>
        <Modal.Content>
          <Form method="POST" initialValues={{ name: '' }} onSubmit={onSubmit}>
            <Modal.Header>
              <Modal.Title>Edit</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <NameField />
            </Modal.Body>
            <Modal.Footer>
              <Button type="submit">Save</Button>
            </Modal.Footer>
          </Form>
        </Modal.Content>
      </UnsavedChangesModal>
    );

    it('closes immediately while the form is untouched', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<FormHarness onOpenChange={onOpenChange} />);

      await user.keyboard('[Escape]');

      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('asks for confirmation once the form is modified', async () => {
      const onOpenChange = jest.fn();
      const { user } = render(<FormHarness onOpenChange={onOpenChange} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Draft');
      await user.keyboard('[Escape]');

      expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it('does not ask while the form is submitting', async () => {
      const onOpenChange = jest.fn();
      let resolveSubmit: () => void = () => {};
      const onSubmit = jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveSubmit = resolve;
          })
      );
      const { user } = render(<FormHarness onOpenChange={onOpenChange} onSubmit={onSubmit} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Draft');
      // `user.click` does not submit a form rendered inside the modal here; `fireEvent` does.
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
      await user.keyboard('[Escape]');

      expect(onOpenChange).toHaveBeenCalledWith(false);
      expect(getAlert()).not.toBeInTheDocument();

      resolveSubmit();
    });
  });

  it('useUnsavedChangesModalDirty does nothing outside a guard', () => {
    expect(() => renderRTL(<DirtyRegistrar isDirty />)).not.toThrow();
  });
});
