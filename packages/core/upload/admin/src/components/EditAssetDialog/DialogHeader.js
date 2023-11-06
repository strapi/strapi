import React from 'react';

import { ModalHeader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

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
