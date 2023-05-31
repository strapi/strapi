import React from 'react';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import { Checkbox } from '@strapi/design-system';
import { getTrad } from '../../utils';

const AdvancedForm = () => {
  const { values, setFieldValue } = useFormikContext();
  const { formatMessage } = useIntl();

  return (
    <Checkbox
      hint={formatMessage({
        id: getTrad('Settings.locales.modal.advanced.setAsDefault.hint'),
        defaultMessage: 'One default locale is required, change it by selecting another one',
      })}
      onChange={() => setFieldValue('isDefault', !values.isDefault)}
      value={values.isDefault}
    >
      {formatMessage({
        id: getTrad('Settings.locales.modal.advanced.setAsDefault'),
        defaultMessage: 'Set as default locale',
      })}
    </Checkbox>
  );
};

export default AdvancedForm;
