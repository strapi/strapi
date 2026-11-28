import * as React from 'react';

import { Button, type ButtonProps, Dialog, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { ConfirmDialogIcon } from './ConfirmDialog';

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

/** All body text is centred, so a wrapped sentence and a short line read the same way. */
const BodyText = styled(Flex)`
  text-align: center;
`;

interface FormConfirmDialogProps {
  open: boolean;
  /** Called when the dialog is dismissed (Cancel, Escape). */
  onClose: () => void;
  title: React.ReactNode;
  /** What the action does; sits under the icon, as `ConfirmDialog`'s body does. */
  children?: React.ReactNode;
  /** Form fields (credentials) shown under the text. */
  fields?: React.ReactNode;
  confirmLabel: React.ReactNode;
  /** `danger-light` by default, like `ConfirmDialog`. */
  variant?: ButtonProps['variant'];
  /**
   * By default the warning icon is neutral while the confirm button is disabled and turns red once
   * `canSubmit`; pass an icon of your own for an action that is not negative.
   */
  icon?: React.ReactElement;
  /**
   * The colour the default icon takes once `canSubmit`: `danger` (red) by default, `primary` for
   * an action that is not negative. It is grey until then either way.
   */
  iconTone?: 'danger' | 'primary';
  /** Whether the required fields are filled in. */
  canSubmit: boolean;
  loading?: boolean;
  onSubmit: (event?: React.FormEvent) => void;
}

/**
 * A `ConfirmDialog` that can hold form fields. The stock `ConfirmDialog` takes a string body and
 * confirms through `Dialog.Action`, which closes the dialog before an awaited, possibly refused
 * submit has answered. This keeps its structure (header, icon above the body text, tertiary Cancel,
 * full-width confirm, `danger-light` by default) but submits a `<form>`, so Enter works and the
 * dialog stays open on a refusal. The confirm button stays disabled until `canSubmit`.
 */
const FormConfirmDialog = ({
  open,
  onClose,
  title,
  children,
  fields,
  confirmLabel,
  variant = 'danger-light',
  icon,
  iconTone = 'danger',
  canSubmit,
  loading,
  onSubmit,
}: FormConfirmDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <Dialog.Content aria-describedby={undefined}>
        <Dialog.Header textAlign="center">{title}</Dialog.Header>
        <Form onSubmit={onSubmit}>
          {/* Stretch, so the credential fields take the dialog's full width in every dialog. */}
          <Dialog.Body alignItems="stretch">
            <Flex justifyContent="center">
              {React.cloneElement(
                icon ?? <ConfirmDialogIcon neutral={!canSubmit} primary={iconTone === 'primary'} />,
                { width: 24, height: 24 }
              )}
            </Flex>
            {children ? (
              <BodyText direction="column" alignItems="stretch" gap={2}>
                {children}
              </BodyText>
            ) : null}
            {fields ? (
              <Flex direction="column" alignItems="stretch" gap={4} paddingTop={2}>
                {fields}
              </Flex>
            ) : null}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button fullWidth variant="tertiary" type="button">
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
            </Dialog.Cancel>
            <Button
              fullWidth
              type="submit"
              variant={variant}
              loading={loading}
              disabled={!canSubmit}
              // The click and the native submit both fire; callers guard re-entrancy synchronously.
              onClick={() => onSubmit()}
            >
              {confirmLabel}
            </Button>
          </Dialog.Footer>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export { FormConfirmDialog };
export type { FormConfirmDialogProps };
