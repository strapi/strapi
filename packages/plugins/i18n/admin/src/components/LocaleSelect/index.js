/* eslint-disable react/jsx-indent */
import React from 'react';
import { Combobox, ComboboxOption } from '@strapi/parts/Combobox';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import useLocales from '../../hooks/useLocales';
import useDefaultLocales from '../../hooks/useDefaultLocales';
import { getTrad } from '../../utils';

/**
 * The component is memoized and needs a useCallback over the onLocaleChange and
 * onClear props to prevent the Select from re-rendering N times when typing on a specific
 * key in a formik form
 */
const LocaleSelect = React.memo(({ value, onLocaleChange, error }) => {
  const { formatMessage } = useIntl();
  const { defaultLocales, isLoading } = useDefaultLocales();
  const { locales } = useLocales();

  const options = (defaultLocales || [])
    .map(locale => ({
      label: locale.name,
      value: locale.code,
    }))
    .filter(({ value: v }) => {
      const foundLocale = locales.find(({ code }) => code === v);

      return !foundLocale;
    });

  const computedValue = value || '';

  return (
    <Combobox
      aria-busy={isLoading}
      error={error}
      label={formatMessage({
        id: getTrad('Settings.locales.modal.locales.label'),
        defaultMessage: 'Locales',
      })}
      value={computedValue}
      onChange={selectedLocaleKey => {
        const selectedLocale = options.find(locale => locale.value === selectedLocaleKey);

        if (selectedLocale) {
          onLocaleChange({ code: selectedLocale.value, displayName: selectedLocale.label });
        }
      }}
      placeholder={formatMessage({ id: 'components.placeholder.select', defaultMessage: 'Select' })}
    >
      {options.map(option => (
        <ComboboxOption value={option.value} key={option.value}>
          {option.label}
        </ComboboxOption>
      ))}
    </Combobox>
  );
});

LocaleSelect.defaultProps = {
  error: undefined,
  value: undefined,
  onLocaleChange: () => undefined,
};

LocaleSelect.propTypes = {
  error: PropTypes.string,
  onLocaleChange: PropTypes.func,
  value: PropTypes.string,
};

export default LocaleSelect;
