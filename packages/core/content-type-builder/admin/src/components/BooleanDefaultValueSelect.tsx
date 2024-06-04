import { Field, SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { IntlLabel } from '../types';

interface Metadata {
  intlLabel: IntlLabel;
  disabled?: boolean;
  hidden?: boolean;
}

interface Option {
  metadatas: Metadata;
  key: string | number;
  value: string | number;
}

interface BooleanDefaultValueSelectProps {
  intlLabel: IntlLabel;
  name: string;
  onChange: (value: any) => void;
  options: Option[];
  value?: any;
}

export const BooleanDefaultValueSelect = ({
  intlLabel,
  name,
  options,
  onChange,
  value = null,
}: BooleanDefaultValueSelectProps) => {
  const { formatMessage } = useIntl();
  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const handleChange = (value: any) => {
    let nextValue: boolean | string = '';

    if (value === 'true') {
      nextValue = true;
    }

    if (value === 'false') {
      nextValue = false;
    }

    onChange({ target: { name, value: nextValue, type: 'select-default-boolean' } });
  };

  return (
    <Field.Root name={name}>
      <Field.Label>{label}</Field.Label>
      <SingleSelect onChange={handleChange} value={(value === null ? '' : value).toString()}>
        {options.map(({ metadatas: { intlLabel, disabled, hidden }, key, value }) => {
          return (
            <SingleSelectOption key={key} value={value} disabled={disabled} hidden={hidden}>
              {/* No need to translate the options */}
              {intlLabel.defaultMessage}
            </SingleSelectOption>
          );
        })}
      </SingleSelect>
    </Field.Root>
  );
};
