import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { useFormikContext } from 'formik';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { TextInput } from '@strapi/design-system/TextInput';
import { Select, Option } from '@strapi/design-system/Select';
import { getTrad } from '../../utils';

const BaseForm = ({ locale }) => {
  const { formatMessage } = useIntl();
  const { values, handleChange, errors } = useFormikContext();

  return (
    <Grid gap={4}>
      <GridItem col={6}>
        <Select
          label={formatMessage({
            id: getTrad('Settings.locales.modal.locales.label'),
            defaultMessage: 'Locales',
          })}
          value={locale.code}
          disabled
        >
          <Option value={locale.code}>{locale.name}</Option>
        </Select>
      </GridItem>

      <GridItem col={6}>
        <TextInput
          name="displayName"
          label={formatMessage({
            id: getTrad('Settings.locales.modal.locales.displayName'),
            defaultMessage: 'Locale display name',
          })}
          hint={formatMessage({
            id: getTrad('Settings.locales.modal.locales.displayName.description'),
            defaultMessage: 'Locale will be displayed under that name in the administration panel',
          })}
          error={
            errors.displayName
              ? formatMessage({
                  id: getTrad('Settings.locales.modal.locales.displayName.error'),
                  defaultMessage: 'The locale display name can only be less than 50 characters.',
                })
              : undefined
          }
          value={values.displayName}
          onChange={handleChange}
        />
      </GridItem>
    </Grid>
  );
};

export default BaseForm;

BaseForm.propTypes = {
  locale: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    code: PropTypes.string.isRequired,
    isDefault: PropTypes.bool.isRequired,
  }).isRequired,
};
