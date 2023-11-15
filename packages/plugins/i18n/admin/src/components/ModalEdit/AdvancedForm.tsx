import * as React from 'react';

import { Checkbox } from '@strapi/design-system';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

type AdvancedFormProps = {
  isDefaultLocale: boolean;
};

const AdvancedForm = ({ isDefaultLocale }: AdvancedFormProps) => {
  const { values, setFieldValue } = useFormikContext<{
    isDefault: boolean;
  }>();
  const { formatMessage } = useIntl();

  return (
    <Checkbox
      name="isDefault"
      hint={formatMessage({
        id: getTrad('Settings.locales.modal.advanced.setAsDefault.hint'),
        defaultMessage: 'One default locale is required, change it by selecting another one',
      })}
      onChange={() => setFieldValue('isDefault', !values.isDefault)}
      value={values.isDefault}
      disabled={isDefaultLocale}
    >
      {formatMessage({
        id: getTrad('Settings.locales.modal.advanced.setAsDefault'),
        defaultMessage: 'Set as default locale',
      })}
    </Checkbox>
  );
};

export default AdvancedForm;
