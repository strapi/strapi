import React from 'react';
import { Typography } from '@strapi/design-system/Typography';
import { ModalHeader } from '@strapi/design-system/ModalLayout';
import { useIntl } from 'react-intl';
import getTrad from '../../utils/getTrad';

export const DialogTitle = () => {
  const { formatMessage } = useIntl();

  return (
    <ModalHeader>
      <Typography fontWeight="bold" textColor="neutral800" as="h2" id="asset-dialog-title">
        {formatMessage({
          id: getTrad('header.actions.upload-assets'),
          defaultMessage: 'Upload assets',
        })}
      </Typography>
    </ModalHeader>
  );
};
