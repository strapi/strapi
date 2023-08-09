import React from 'react';

import {
  Button,
  Box,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  Typography,
} from '@strapi/design-system';
import { ExclamationMarkCircle, Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

export const Root = ({
  children,
  iconRightButton,
  isConfirmButtonLoading,
  leftButtonText,
  onConfirm,
  onToggleDialog,
  rightButtonText,
  title,
  variantRightButton,
  ...props
}) => {
  const { formatMessage } = useIntl();

  return (
    <Dialog
      onClose={onToggleDialog}
      title={formatMessage({
        id: title.id,
        defaultMessage: title.defaultMessage,
      })}
      labelledBy="confirmation"
      describedBy="confirm-description"
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

Root.defaultProps = {
  iconBody: <ExclamationMarkCircle />,
  iconRightButton: <Trash />,
  isConfirmButtonLoading: false,
  leftButtonText: {
    id: 'app.components.Button.cancel',
    defaultMessage: 'Cancel',
  },
  rightButtonText: {
    id: 'app.components.Button.confirm',
    defaultMessage: 'Confirm',
  },
  title: {
    id: 'app.components.ConfirmDialog.title',
    defaultMessage: 'Confirmation',
  },
  variantRightButton: 'danger-light',
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
  iconBody: PropTypes.node,
  iconRightButton: PropTypes.node,
  isConfirmButtonLoading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
  leftButtonText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  rightButtonText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  title: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  variantRightButton: PropTypes.string,
};

export const Body = ({ iconBody, children }) => {
  return (
    <DialogBody icon={iconBody}>
      <Flex direction="column" alignItems="stretch" gap={2}>
        <Flex justifyContent="center">{children}</Flex>
      </Flex>
    </DialogBody>
  );
};

Body.defaultProps = {
  iconBody: <ExclamationMarkCircle />,
};

Body.propTypes = {
  children: PropTypes.node.isRequired,
  iconBody: PropTypes.node,
};

const Footer = ({
  iconRightButton,
  isConfirmButtonLoading,
  leftButtonText,
  onConfirm,
  onToggleDialog,
  rightButtonText,
  variantRightButton,
}) => {
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

Footer.propTypes = {
  iconRightButton: PropTypes.node.isRequired,
  isConfirmButtonLoading: PropTypes.bool.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
  leftButtonText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }).isRequired,
  rightButtonText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }).isRequired,
  variantRightButton: PropTypes.string.isRequired,
};

const ConfirmDialog = ({ bodyText, onToggleDialog, onConfirm, title, ...props }) => {
  const { formatMessage } = useIntl();

  return (
    <Root onConfirm={onConfirm} onToggleDialog={onToggleDialog} title={title} {...props}>
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

ConfirmDialog.defaultProps = {
  bodyText: {
    id: 'components.popUpWarning.message',
    defaultMessage: 'Are you sure you want to delete this?',
  },
  iconBody: <ExclamationMarkCircle />,
  iconRightButton: <Trash />,
  isConfirmButtonLoading: false,
  leftButtonText: {
    id: 'app.components.Button.cancel',
    defaultMessage: 'Cancel',
  },
  rightButtonText: {
    id: 'app.components.Button.confirm',
    defaultMessage: 'Confirm',
  },
  title: {
    id: 'app.components.ConfirmDialog.title',
    defaultMessage: 'Confirmation',
  },
  variantRightButton: 'danger-light',
};

ConfirmDialog.propTypes = {
  bodyText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  iconBody: PropTypes.node,
  iconRightButton: PropTypes.node,
  isConfirmButtonLoading: PropTypes.bool,
  onConfirm: PropTypes.func.isRequired,
  onToggleDialog: PropTypes.func.isRequired,
  leftButtonText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  rightButtonText: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  title: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  variantRightButton: PropTypes.string,
};

ConfirmDialog.Root = Root;
ConfirmDialog.Body = Body;

export { ConfirmDialog };
