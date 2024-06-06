import * as React from 'react';

import { Button, Modal } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

export const DialogFooter = ({ onClose, onValidate }) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Footer>
      <Button onClick={onClose} variant="tertiary">
        {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
      </Button>
      {onValidate && (
        <Button onClick={onValidate}>
          {formatMessage({ id: 'global.finish', defaultMessage: 'Finish' })}
        </Button>
      )}
    </Modal.Footer>
  );
};

DialogFooter.defaultProps = {
  onValidate: undefined,
};

DialogFooter.propTypes = {
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func,
};
