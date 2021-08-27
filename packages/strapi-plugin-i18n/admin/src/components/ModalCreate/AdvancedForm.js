import React from 'react';
import { Text, Checkbox, Padded } from '@buffetjs/core';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';
import { BaselineAlignment } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';

const AdvancedForm = () => {
  const { values, setFieldValue } = useFormikContext();
  const { formatMessage } = useIntl();

  return (
    <div>
      <BaselineAlignment top size="2px" />
      <Padded bottom size="sm">
        <Text color="grey" textTransform="uppercase">
          {formatMessage({
            id: getTrad('Settings.locales.modal.advanced.settings'),
          })}
        </Text>
      </Padded>

      <BaselineAlignment top size="10px" />
      <Checkbox
        id="default-checkbox"
        name="default-checkbox"
        onChange={() => setFieldValue('isDefault', !values.isDefault)}
        message={formatMessage({
          id: getTrad('Settings.locales.modal.advanced.setAsDefault'),
        })}
        someChecked={false}
        value={values.isDefault}
        htmlFor="default-checkbox"
      />

      <Text color="grey" fontSize="sm">
        {formatMessage({
          id: getTrad('Settings.locales.modal.advanced.setAsDefault.hint'),
        })}
      </Text>
    </div>
  );
};

export default AdvancedForm;
