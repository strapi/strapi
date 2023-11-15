import * as React from 'react';

import { Grid, GridItem, Option, Select, TextInput } from '@strapi/design-system';
import { useFormikContext } from 'formik';
import { useIntl } from 'react-intl';

import useDefaultLocales from '../../hooks/useDefaultLocales';
import { getTranslation } from '../../utils';

type BaseFormProps = {
  locale: {
    id: number;
    name: string;
    code: string;
    isDefault: boolean;
  };
};

const BaseForm = ({ locale }: BaseFormProps) => {
  const { formatMessage } = useIntl();
  const { values, handleChange, errors } = useFormikContext<{
    displayName: string;
  }>();
  const { defaultLocales, isLoading } = useDefaultLocales();

  const localeDetails =
    !isLoading && defaultLocales.find((row: { code: string }) => row.code === locale.code);

  return (
    <Grid gap={4}>
      <GridItem col={6}>
        <Select
          label={formatMessage({
            id: getTranslation('Settings.locales.modal.locales.label'),
            defaultMessage: 'Locales',
          })}
          value={localeDetails?.code || locale.code}
          disabled
        >
          <Option value={localeDetails?.code || locale.code}>
            {localeDetails?.name || locale.code}
          </Option>
        </Select>
      </GridItem>

      <GridItem col={6}>
        <TextInput
          name="displayName"
          label={formatMessage({
            id: getTranslation('Settings.locales.modal.locales.displayName'),
            defaultMessage: 'Locale display name',
          })}
          hint={formatMessage({
            id: getTranslation('Settings.locales.modal.locales.displayName.description'),
            defaultMessage: 'Locale will be displayed under that name in the administration panel',
          })}
          error={
            errors.displayName
              ? formatMessage({
                  id: getTranslation('Settings.locales.modal.locales.displayName.error'),
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
