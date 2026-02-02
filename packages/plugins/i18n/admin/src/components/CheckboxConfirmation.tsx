import * as React from 'react';

import { Button, Checkbox, Dialog, Field, Flex, Typography } from '@strapi/design-system';
import { WarningCircle } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { styled } from 'styled-components';

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
  };

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
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Field.Root hint={hint} name={name}>
        <Checkbox onCheckedChange={handleChange} checked={value}>
          {label}
        </Checkbox>
        <Field.Hint />
      </Field.Root>
      <Dialog.Content>
        <Dialog.Header>
          {formatMessage({
            id: getTranslation('CheckboxConfirmation.Modal.title'),
            defaultMessage: 'Disable localization',
          })}
        </Dialog.Header>
        <Dialog.Body icon={<WarningCircle />}>
          <Flex direction="column" alignItems="stretch" gap={2}>
            <Flex justifyContent="center">
              <TextAlignTypography>
                {formatMessage({
                  id: getTranslation('CheckboxConfirmation.Modal.content'),
                  defaultMessage:
                    'Disabling localization will engender the deletion of all your content but the one associated to your default locale (if existing).',
                })}
              </TextAlignTypography>
            </Flex>
            <Flex justifyContent="center">
              <Typography fontWeight="semiBold">
                {formatMessage({
                  id: getTranslation('CheckboxConfirmation.Modal.body'),
                  defaultMessage: 'Do you want to disable it?',
                })}
              </Typography>
            </Flex>
          </Flex>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary">
              {formatMessage({
                id: 'components.popUpWarning.button.cancel',
                defaultMessage: 'No, cancel',
              })}
            </Button>
          </Dialog.Cancel>
          <Dialog.Action>
            <Button variant="danger-light" onClick={handleConfirm}>
              {formatMessage({
                id: getTranslation('CheckboxConfirmation.Modal.button-confirm'),
                defaultMessage: 'Yes, disable',
              })}
            </Button>
          </Dialog.Action>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export { CheckboxConfirmation };
