/**
 *
 * DraftAndPublishToggle
 *
 */

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Dialog, DialogBody, DialogFooter } from '@strapi/parts/Dialog';
import { ToggleInput } from '@strapi/parts/ToggleInput';
import { Text } from '@strapi/parts/Text';
import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { Button } from '@strapi/parts/Button';
import AlertWarningIcon from '@strapi/icons/AlertWarningIcon';
import { getTrad } from '../../utils';

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
          <DialogBody icon={<AlertWarningIcon />}>
            <Stack size={2}>
              <Row justifyContent="center" style={{ textAlign: 'center' }}>
                <Text id="confirm-description">
                  {formatMessage({
                    id: getTrad('popUpWarning.draft-publish.message'),
                    defaultMessage:
                      'If you disable the Draft/Publish system, your drafts will be deleted.',
                  })}
                </Text>
              </Row>
              <Row justifyContent="center" style={{ textAlign: 'center' }}>
                <Text id="confirm-description">
                  {formatMessage({
                    id: getTrad('popUpWarning.draft-publish.second-message'),
                    defaultMessage: 'Are you sure you want to disable it?',
                  })}
                </Text>
              </Row>
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
