import { Button, Modal } from '@strapi/design-system';
import { useIntl } from 'react-intl';

interface DialogFooterProps {
  onClose: () => void;
  onValidate?: () => void;
}

export const DialogFooter = ({ onClose, onValidate }: DialogFooterProps) => {
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
