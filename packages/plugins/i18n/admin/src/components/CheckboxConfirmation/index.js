import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Checkbox } from '@strapi/design-system/Checkbox';
import { Dialog, DialogBody, DialogFooter } from '@strapi/design-system/Dialog';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import ExclamationMarkCircle from '@strapi/icons/ExclamationMarkCircle';
import { getTrad } from '../../utils';

const TextAlignTypography = styled(Typography)`
  text-align: center;
`;

const CheckboxConfirmation = ({ description, isCreating, intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = value => {
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

  const handleToggle = () => setIsOpen(prev => !prev);

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
            <Stack spacing={2}>
              <Flex justifyContent="center">
                <TextAlignTypography id="confirm-description">
                  {formatMessage({
                    id: getTrad('CheckboxConfirmation.Modal.content'),
                    defaultMessage:
                      'Disabling localization will engender the deletion of all your content but the one associated to your default locale (if existing).',
                  })}
                </TextAlignTypography>
              </Flex>
              <Flex justifyContent="center">
                <Typography fontWeight="semiBold" id="confirm-description">
                  {formatMessage({
                    id: getTrad('CheckboxConfirmation.Modal.body'),
                    defaultMessage: 'Do you want to disable it?',
                  })}
                </Typography>
              </Flex>
            </Stack>
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
                  id: getTrad('CheckboxConfirmation.Modal.button-confirm'),
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

CheckboxConfirmation.defaultProps = {
  description: null,
  isCreating: false,
};

CheckboxConfirmation.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  isCreating: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool.isRequired,
};

export default CheckboxConfirmation;
