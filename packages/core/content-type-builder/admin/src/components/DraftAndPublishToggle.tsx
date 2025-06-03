/**
 *
 * DraftAndPublishToggle
 *
 */

import { useState } from 'react';

import { ConfirmDialog } from '@strapi/admin/strapi-admin';
import { Button, Checkbox, CheckboxProps, Dialog, Field } from '@strapi/design-system';
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

  const handleConfirm = () => {
    onChange({ target: { name, value: false } });

    setShowWarning(false);
  };

  const handleChange: CheckboxProps['onCheckedChange'] = (checked) => {
    if (!checked && !isCreating) {
      setShowWarning(true);

      return;
    }

    onChange({ target: { name, value: !!checked } });
  };

  return (
    <>
      <Field.Root hint={hint} name={name}>
        <Checkbox checked={value} disabled={disabled} onCheckedChange={handleChange}>
          {label}
        </Checkbox>
        <Field.Hint />
      </Field.Root>

      <Dialog.Root open={showWarning} onOpenChange={(isOpen) => setShowWarning(isOpen)}>
        <ConfirmDialog
          endAction={
            <Button onClick={handleConfirm} variant="danger" width="100%" justifyContent="center">
              {formatMessage({
                id: getTrad('popUpWarning.draft-publish.button.confirm'),
                defaultMessage: 'Yes, disable',
              })}
            </Button>
          }
        >
          {formatMessage({
            id: getTrad('popUpWarning.draft-publish.message'),
            defaultMessage: 'If you disable the draft & publish, your drafts will be deleted.',
          })}
        </ConfirmDialog>
      </Dialog.Root>
    </>
  );
};
