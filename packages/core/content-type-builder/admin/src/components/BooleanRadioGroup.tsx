import * as React from 'react';

import { CustomRadioGroup } from './CustomRadioGroup';

import type { FormChangeHandler, IntlLabel } from '../types';

interface BooleanRadioGroupProps {
  intlLabel: IntlLabel;
  name: string;
  onChange: FormChangeHandler<boolean, 'boolean-radio-group'>;
}

export const BooleanRadioGroup = ({
  onChange,
  name,
  intlLabel,
  ...rest
}: BooleanRadioGroupProps) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.value !== 'false';

    onChange({ target: { name, value: checked, type: 'boolean-radio-group' } });
  };

  return <CustomRadioGroup {...rest} name={name} onChange={handleChange} intlLabel={intlLabel} />;
};
