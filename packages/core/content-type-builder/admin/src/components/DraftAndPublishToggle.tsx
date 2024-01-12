/**
 *
 * DraftAndPublishToggle
 *
 */

import { useState } from 'react';

import { Checkbox } from '@strapi/design-system';
import { ConfirmDialog } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { getTrad } from '../utils';

import type { IntlLabel } from '../types';

interface Description {
  id: string;
  defaultMessage: string;
  values?: Record<string, any>;
}

interface DraftAndPublishToggleProps {
  description?: Description;
  disabled?: boolean;
  intlLabel: IntlLabel;
  isCreating: boolean;
  name: string;
  onChange: (value: { target: { name: string; value: boolean } }) => void;
  value?: boolean;
}

export const DraftAndPublishToggle = ({
  description,
  disabled = false,
  intlLabel,
  isCreating,
  name,
  onChange,
  value = false,
}: DraftAndPublishToggleProps) => {
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

    handleToggle();
  };

  const handleChange = ({ target: { checked } }: { target: { checked: boolean } }) => {
    if (!checked && !isCreating) {
      handleToggle();

      return;
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
          id: getTrad('popUpWarning.draft-publish.message'),
          defaultMessage: 'If you disable the draft & publish, your drafts will be deleted.',
        }}
        leftButtonText={{
          id: 'components.popUpWarning.button.cancel',
          defaultMessage: 'No, cancel',
        }}
        rightButtonText={{
          id: getTrad('popUpWarning.draft-publish.button.confirm'),
          defaultMessage: 'Yes, disable',
        }}
      />
    </>
  );
};
