import React from 'react';
import PropTypes from 'prop-types';
import { Button } from '@strapi/parts/Button';
import { ModalFooter } from '@strapi/parts/ModalLayout';
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
          <>
            <Button onClick={onValidate}>
              {formatMessage({ id: 'form.button.finish', defaultMessage: 'Finish' })}
            </Button>
          </>
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
