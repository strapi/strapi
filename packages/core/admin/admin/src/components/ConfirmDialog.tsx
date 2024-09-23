import * as React from 'react';

import { Button, ButtonProps, Dialog } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialog
 * -----------------------------------------------------------------------------------------------*/
interface ConfirmDialogProps extends Pick<ButtonProps, 'variant'>, Pick<Dialog.BodyProps, 'icon'> {
  onConfirm?: (e?: React.MouseEvent<HTMLButtonElement>) => Promise<void> | void;
  children?: React.ReactNode;
  endAction?: React.ReactNode;
  startAction?: React.ReactNode;
  title?: React.ReactNode;
}

/**
 * @beta
 * @public
 * @description A simple confirm dialog that out of the box can be used to confirm an action.
 * The component can additionally be customised if required e.g. the footer actions can be
 * completely replaced, but cannot be removed. Passing a string as the children prop will render
 * the string as the body of the dialog. If you need more control over the body, you can pass a
 * custom component as the children prop.
 * @example
 * ```tsx
 * import { Dialog } from '@strapi/design-system';
 *
 * const DeleteAction = ({ id }) => {
 *  const [isOpen, setIsOpen] = React.useState(false);
 *
 *  const [delete] = useDeleteMutation()
 *  const handleConfirm = async () => {
 *    await delete(id)
 *    setIsOpen(false)
 *  }
 *
 *  return (
 *    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
 *      <Dialog.Trigger>
 *        <Button>Delete</Button>
 *      </Dialog.Trigger>
 *      <ConfirmDialog onConfirm={handleConfirm} />
 *    </Dialog.Root>
 *  )
 * }
 * ```
 */
const ConfirmDialog = ({
  children,
  icon = <StyledWarning />,
  onConfirm,
  variant = 'danger-light',
  startAction,
  endAction,
  title,
}: ConfirmDialogProps) => {
  const { formatMessage } = useIntl();
  const [isConfirming, setIsConfirming] = React.useState(false);

  const content =
    children ||
    formatMessage({
      id: 'app.confirm.body',
      defaultMessage: 'Are you sure?',
    });

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onConfirm) {
      return;
    }

    try {
      setIsConfirming(true);
      await onConfirm(e);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog.Content>
      <Dialog.Header>
        {title ||
          formatMessage({
            id: 'app.components.ConfirmDialog.title',
            defaultMessage: 'Confirmation',
          })}
      </Dialog.Header>
      <Dialog.Body icon={icon}>{content}</Dialog.Body>
      <Dialog.Footer>
        {startAction || (
          <Dialog.Cancel>
            <Button
              fullWidth
              variant="tertiary"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          </Dialog.Cancel>
        )}
        {endAction || (
          <Dialog.Action>
            <Button fullWidth onClick={handleConfirm} variant={variant} loading={isConfirming}>
              {formatMessage({
                id: 'app.components.Button.confirm',
                defaultMessage: 'Confirm',
              })}
            </Button>
          </Dialog.Action>
        )}
      </Dialog.Footer>
    </Dialog.Content>
  );
};

const StyledWarning = styled(WarningCircle)`
  width: 24px;
  height: 24px;

  path {
    fill: ${({ theme }) => theme.colors.danger600};
  }
`;

export { ConfirmDialog };
export type { ConfirmDialogProps };
