import * as React from 'react';

import {
  Button,
  ButtonProps,
  Box,
  BoxProps,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  Typography,
  DialogBodyProps,
  FlexProps,
  DialogProps,
} from '@strapi/design-system';
import { ExclamationMarkCircle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

export interface RootProps extends Partial<FooterProps>, Pick<BoxProps, 'children'> {
  isOpen: boolean;
  title?: {
    id: string;
    defaultMessage: string;
  };
  onToggleDialog: DialogProps['onClose'];
  onConfirm: FooterProps['onConfirm'];
}
export const Root = ({
  children,
  iconRightButton,
  isConfirmButtonLoading = false,
  isOpen,
  onConfirm,
  onToggleDialog,
  leftButtonText = {
    id: 'app.components.Button.cancel',
    defaultMessage: 'Cancel',
  },
  rightButtonText = {
    id: 'app.components.Button.confirm',
    defaultMessage: 'Confirm',
  },
  title = {
    id: 'app.components.ConfirmDialog.title',
    defaultMessage: 'Confirmation',
  },
  variantRightButton = 'danger-light',
  ...props
}: RootProps) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: title.id,
        defaultMessage: title.defaultMessage,
      })}
      isOpen={isOpen}
      id="confirmation"
      {...props}
    >
      <Box id="confirm-description">{children}</Box>

      <Footer
        iconRightButton={iconRightButton}
        isConfirmButtonLoading={isConfirmButtonLoading}
        leftButtonText={leftButtonText}
        onConfirm={onConfirm}
        onToggleDialog={onToggleDialog}
        rightButtonText={rightButtonText}
        variantRightButton={variantRightButton}
      />
    </Dialog>
  );
};

export interface BodyProps {
  children: FlexProps['children'];
  iconBody?: DialogBodyProps['icon'];
}

export const Body = ({ iconBody = <ExclamationMarkCircle />, children }: BodyProps) => {
  return (
    <DialogBody icon={iconBody}>
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Flex justifyContent="center">{children}</Flex>
      </Flex>
    </DialogBody>
  );
};

interface FooterProps {
  iconRightButton?: ButtonProps['startIcon'];
  isConfirmButtonLoading: boolean;
  onConfirm: ButtonProps['onClick'];
  onToggleDialog: ButtonProps['onClick'];
  leftButtonText: {
    id: string;
    defaultMessage: string;
  };
  rightButtonText: {
    id: string;
    defaultMessage: string;
  };
  variantRightButton: ButtonProps['variant'];
}

const Footer = ({
  iconRightButton = <Trash />,
  isConfirmButtonLoading,
  leftButtonText,
  onConfirm,
  onToggleDialog,
  rightButtonText,
  variantRightButton,
}: FooterProps) => {
  const { formatMessage } = useIntl();

  return (
    <DialogFooter
      startAction={
        <Button onClick={onToggleDialog} variant="tertiary">
          {formatMessage({
            id: leftButtonText.id,
            defaultMessage: leftButtonText.defaultMessage,
          })}
        </Button>
      }
      endAction={
        <Button
          onClick={onConfirm}
          variant={variantRightButton}
          startIcon={iconRightButton}
          id="confirm-delete"
          loading={isConfirmButtonLoading}
        >
          {formatMessage({
            id: rightButtonText.id,
            defaultMessage: rightButtonText.defaultMessage,
          })}
        </Button>
      }
    />
  );
};

export interface ConfirmDialogProps extends Omit<RootProps, 'children'> {
  bodyText?: {
    id: string;
    defaultMessage: string;
  };
}

interface ConfirmDialogComponent extends React.FC<ConfirmDialogProps> {
  Root: React.FC<RootProps>;
  Body: React.FC<BodyProps>;
}
const ConfirmDialog: ConfirmDialogComponent = ({
  bodyText = {
    id: 'components.popUpWarning.message',
    defaultMessage: 'Are you sure you want to delete this?',
  },
  ...props
}: ConfirmDialogProps) => {
  const { formatMessage } = useIntl();

  return (
    <Root {...props}>
      <Body>
        <Typography variant="omega">
          {formatMessage({
            id: bodyText.id,
            defaultMessage: bodyText.defaultMessage,
          })}
        </Typography>
      </Body>
    </Root>
  );
};

ConfirmDialog.Root = Root;
ConfirmDialog.Body = Body;

export { ConfirmDialog };
