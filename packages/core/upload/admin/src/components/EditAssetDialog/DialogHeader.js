import React from 'react';
import { useIntl } from 'react-intl';
import { Typography, ModalHeader } from '@strapi/design-system';

export const DialogHeader = () => {
  const { formatMessage } = useIntl();

  return (
    <ModalHeader>
      <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
        {formatMessage({ id: 'global.details', defaultMessage: 'Details' })}
      </Typography>
    </ModalHeader>
  );
};
