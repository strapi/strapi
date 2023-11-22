import * as React from 'react';

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogFooter,
  Flex,
  Typography,
} from '@strapi/design-system';
import { ExclamationMarkCircle } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTranslation } from '../utils/getTranslation';

const TextAlignTypography = styled(Typography)`
  text-align: center;
`;

interface IntlMessage extends MessageDescriptor {
  values: object;
}

interface CheckboxConfirmationProps {
  description: IntlMessage;
  intlLabel: IntlMessage;
  isCreating?: boolean;
  name: string;
  onChange: (event: { target: { name: string; value: boolean; type: string } }) => void;
  value: boolean;
}

const CheckboxConfirmation = ({
  description,
  isCreating = false,
  intlLabel,
  name,
  onChange,
  value,
}: CheckboxConfirmationProps) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleChange = (value: boolean) => {
    if (isCreating || value) {
      return onChange({ target: { name, value, type: 'checkbox' } });
    }

    if (!value) {
      return setIsOpen(true);
    }

    return null;
  };

  const handleConfirm = () => {
    onChange({ target: { name, value: false, type: 'checkbox' } });
    setIsOpen(false);
  };

  const handleToggle = () => setIsOpen((prev) => !prev);

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const hint = description
    ? formatMessage(
        { id: description.id, defaultMessage: description.defaultMessage },
        { ...description.values }
      )
    : '';

  return (
    <>
      <Checkbox
        hint={hint}
        id={name}
        name={name}
        onValueChange={handleChange}
        value={value}
        type="checkbox"
      >
        {label}
      </Checkbox>
      {isOpen && (
        <Dialog onClose={handleToggle} title="Confirmation" isOpen={isOpen}>
          <DialogBody icon={<ExclamationMarkCircle />}>
            <Flex direction="column" alignItems="stretch" gap={2}>
              <Flex justifyContent="center">
                <TextAlignTypography id="confirm-description">
                  {formatMessage({
                    id: getTranslation('CheckboxConfirmation.Modal.content'),
                    defaultMessage:
                      'Disabling localization will engender the deletion of all your content but the one associated to your default locale (if existing).',
                  })}
                </TextAlignTypography>
              </Flex>
              <Flex justifyContent="center">
                <Typography fontWeight="semiBold" id="confirm-description">
                  {formatMessage({
                    id: getTranslation('CheckboxConfirmation.Modal.body'),
                    defaultMessage: 'Do you want to disable it?',
                  })}
                </Typography>
              </Flex>
            </Flex>
          </DialogBody>
          <DialogFooter
            startAction={
              <Button onClick={handleToggle} variant="tertiary">
                {formatMessage({
                  id: 'components.popUpWarning.button.cancel',
                  defaultMessage: 'No, cancel',
                })}
              </Button>
            }
            endAction={
              <Button variant="danger-light" onClick={handleConfirm}>
                {formatMessage({
                  id: getTranslation('CheckboxConfirmation.Modal.button-confirm'),
                  defaultMessage: 'Yes, disable',
                })}
              </Button>
            }
          />
        </Dialog>
      )}
    </>
  );
};

export { CheckboxConfirmation };
