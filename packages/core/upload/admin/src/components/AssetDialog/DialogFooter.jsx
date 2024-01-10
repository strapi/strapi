import React from 'react';

import { Button, ModalFooter } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

export const DialogFooter = ({ onClose, onValidate }) => {
  const { formatMessage } = useIntl();

  return (
    <ModalFooter
      startActions={
        <Button onClick={onClose} variant="tertiary">
          {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
        </Button>
      }
      endActions={
        onValidate && (
          <Button onClick={onValidate}>
            {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
          </Button>
        )
      }
    />
  );
};

DialogFooter.defaultProps = {
  onValidate: undefined,
};

DialogFooter.propTypes = {
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func,
};
