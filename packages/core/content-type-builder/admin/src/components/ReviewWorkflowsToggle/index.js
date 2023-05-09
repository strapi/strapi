import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Checkbox } from '@strapi/design-system';
import { ConfirmDialog, useTracking } from '@strapi/helper-plugin';

import { getTrad } from '../../utils';

const ReviewWorkflowsToggle = ({
  description,
  disabled,
  intlLabel,
  isCreating,
  name,
  onChange,
  value,
}) => {
  const { trackUsage } = useTracking();
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

  const handleToggle = () => setShowWarning((prev) => !prev);

  const handleConfirm = () => {
    onChange({ target: { name, value: false } });
    trackUsage('willDisableWorkflow');
    handleToggle();
  };

  const handleChange = ({ target: { checked } }) => {
    if (!checked && !isCreating) {
      handleToggle();

      return;
    }

    if (checked) {
      trackUsage('willEnableWorkflow');
    }

    onChange({ target: { name, value: checked } });
  };

  return (
    <>
      <Checkbox checked={value} disabled={disabled} hint={hint} name={name} onChange={handleChange}>
        {label}
      </Checkbox>

      <ConfirmDialog
        isOpen={showWarning}
        onToggleDialog={handleToggle}
        onConfirm={handleConfirm}
        bodyText={{
          id: getTrad('popUpWarning.review-workflows.message'),
          defaultMessage:
            'If you disable the review workflows feature, all stage-related information will be removed for this content-type. Are you sure you want to disable it?',
        }}
        leftButtonText={{
          id: 'components.popUpWarning.button.cancel',
          defaultMessage: 'No, cancel',
        }}
        rightButtonText={{
          id: getTrad('popUpWarning.review-workflows.button.confirm'),
          defaultMessage: 'Yes, disable',
        }}
      />
    </>
  );
};

ReviewWorkflowsToggle.defaultProps = {
  description: null,
  disabled: false,
  value: false,
};

ReviewWorkflowsToggle.propTypes = {
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

export default ReviewWorkflowsToggle;
