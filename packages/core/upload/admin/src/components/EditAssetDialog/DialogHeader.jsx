import * as React from 'react';

import { Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

export const DialogHeader = () => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Header>
      <Modal.Title>
        {formatMessage({ id: 'global.details', defaultMessage: 'Details' })}
      </Modal.Title>
    </Modal.Header>
  );
};
