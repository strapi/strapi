/**
 *
 * DraftAndPublishToggle
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { Dialog, DialogBody, DialogFooter } from '@strapi/design-system/Dialog';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { Typography } from '@strapi/design-system/Typography';
import { Flex } from '@strapi/design-system/Flex';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import ExclamationMarkCircle from '@strapi/icons/ExclamationMarkCircle';
import { getTrad } from '../../utils';

const TypographyTextAlign = styled(Typography)`
  text-align: center;
`;

const DraftAndPublishToggle = ({
  description,
  disabled,
  intlLabel,
  isCreating,
  name,
  onChange,
  value,
}) => {
  const { formatMessage } = useIntl();
  const [showWarning, setShowWarning] = useState(false);
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

  const handleToggle = () => setShowWarning(prev => !prev);

  const handleConfirm = () => {
    onChange({ target: { name, value: false } });

    handleToggle();
  };

  const handleChange = ({ target: { checked } }) => {
    if (!checked && !isCreating) {
      handleToggle();

      return;
    }

    onChange({ target: { name, value: checked } });
  };

  return (
    <>
      <ToggleInput
        checked={value || false}
        disabled={disabled}
        hint={hint}
        label={label}
        name={name}
        offLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.off-label',
          defaultMessage: 'Off',
        })}
        onLabel={formatMessage({
          id: 'app.components.ToggleCheckbox.on-label',
          defaultMessage: 'On',
        })}
        onChange={handleChange}
      />
      {showWarning && (
        <Dialog onClose={handleToggle} title="Confirmation" isOpen={showWarning}>
          <DialogBody icon={<ExclamationMarkCircle />}>
            <Stack size={2}>
              <Flex justifyContent="center">
                <TypographyTextAlign id="confirm-description">
                  {formatMessage({
                    id: getTrad('popUpWarning.draft-publish.message'),
                    defaultMessage:
                      'If you disable the Draft/Publish system, your drafts will be deleted.',
                  })}
                </TypographyTextAlign>
              </Flex>
              <Flex justifyContent="center">
                <Typography id="confirm-description">
                  {formatMessage({
                    id: getTrad('popUpWarning.draft-publish.second-message'),
                    defaultMessage: 'Are you sure you want to disable it?',
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
                  id: getTrad('popUpWarning.draft-publish.button.confirm'),
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

DraftAndPublishToggle.defaultProps = {
  description: null,
  disabled: false,
  value: false,
};

DraftAndPublishToggle.propTypes = {
  description: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }),
  disabled: PropTypes.bool,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  isCreating: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.bool,
};

export default DraftAndPublishToggle;
