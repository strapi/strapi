import React from 'react';

import { Checkbox } from '@strapi/design-system';
import { useFormikContext } from 'formik';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../utils';

const AdvancedForm = ({ isDefaultLocale }) => {
  const { values, setFieldValue } = useFormikContext();
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

AdvancedForm.propTypes = {
  isDefaultLocale: PropTypes.bool.isRequired,
};

export default AdvancedForm;
