import * as React from 'react';

import { IntlLabel } from '../types';

import { CustomRadioGroup } from './CustomRadioGroup';

interface BooleanRadioGroupProps {
  intlLabel: IntlLabel;
  name: string;
  onChange: (value: any) => void;
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
