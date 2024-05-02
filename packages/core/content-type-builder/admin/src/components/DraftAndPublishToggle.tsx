/**
 *
 * DraftAndPublishToggle
 *
 */

import { useState } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Checkbox, Field } from '@strapi/design-system';
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
      <Field.Root hint={hint} name={name}>
        <Checkbox checked={value} disabled={disabled} onChange={handleChange}>
          {label}
        </Checkbox>
        <Field.Hint />
      </Field.Root>

      <ConfirmDialog isOpen={showWarning} onClose={handleToggle} onConfirm={handleConfirm}>
        {formatMessage({
          id: getTrad('popUpWarning.draft-publish.message'),
          defaultMessage: 'If you disable the draft & publish, your drafts will be deleted.',
        })}
      </ConfirmDialog>
    </>
  );
};
