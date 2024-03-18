import * as React from 'react';

import {
  Button,
  ButtonProps,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  Typography,
  DialogBodyProps,
  DialogProps,
  DialogFooterProps,
} from '@strapi/design-system';
import { ExclamationMarkCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

/* -------------------------------------------------------------------------------------------------
 * ConfirmDialog
 * -----------------------------------------------------------------------------------------------*/
interface ConfirmDialogProps
  extends Omit<DialogProps, 'title'>,
    Partial<Pick<DialogProps, 'title'>>,
    Pick<ButtonProps, 'variant'>,
    Partial<DialogFooterProps>,
    Pick<DialogBodyProps, 'icon'> {
  onConfirm?: () => Promise<void> | void;
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
 * const DeleteAction = ({ id }) => {
 *  const [isOpen, setIsOpen] = React.useState(false);
 *
 *  const [delete] = useDeleteMutation()
 *  const handleConfirm = async () => {
 *    await delete(id)
 *  }
 *
 *  return (
 *    <>
 *      <Button onClick={() => setIsOpen(true)}>Delete</Button>
 *      <ConfirmDialog onConfirm={handleConfirm} onClose={() => setIsOpen(false)} isOpen={isOpen} />
 *    </>
 *  )
 * }
 * ```
 */
const ConfirmDialog = ({
  children,
  icon = <ExclamationMarkCircle />,
  onClose,
  onConfirm,
  variant = 'danger',
  startAction,
  endAction,
  ...props
}: ConfirmDialogProps) => {
  const { formatMessage } = useIntl();
  const [isConfirming, setIsConfirming] = React.useState(false);

  const content =
    children ||
    formatMessage({
      id: 'app.confirm.body',
      defaultMessage: 'Are you sure?',
    });

  const handleConfirm = async () => {
    if (!onConfirm) {
      return;
    }

    try {
      setIsConfirming(true);
      await onConfirm();
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog
      title={formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      })}
      onClose={onClose}
      {...props}
    >
      <DialogBody icon={icon}>
        {typeof content === 'string' ? <DefaultBodyWrapper>{content}</DefaultBodyWrapper> : content}
      </DialogBody>
      <DialogFooter
        startAction={
          startAction || (
            <Button onClick={onClose} variant="tertiary">
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          )
        }
        endAction={
          endAction || (
            <Button onClick={handleConfirm} variant={variant} loading={isConfirming}>
              {formatMessage({
                id: 'app.components.Button.confirm',
                defaultMessage: 'Confirm',
              })}
            </Button>
          )
        }
      />
    </Dialog>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DefaultBodyWrapper
 * -----------------------------------------------------------------------------------------------*/
interface DefaultBodyWrapperProps {
  children: React.ReactNode;
}

const DefaultBodyWrapper = ({ children }: DefaultBodyWrapperProps) => {
  return (
    <Flex direction="column" alignItems="stretch" gap={2}>
      <Flex justifyContent="center">
        <Typography variant="omega">{children}</Typography>
      </Flex>
    </Flex>
  );
};

export { ConfirmDialog };
export type { ConfirmDialogProps };
