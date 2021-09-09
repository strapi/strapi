import React from 'react';
import styled from 'styled-components';
import { Select, Option } from '@strapi/parts/Select';
import { Loader } from '@strapi/parts/Loader';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import useLocales from '../../hooks/useLocales';
import useDefaultLocales from '../../hooks/useDefaultLocales';
import { getTrad } from '../../utils';

const SmallLoader = styled(Loader)`
  img {
    height: 1rem;
    width: 1rem;
  }
`;

/**
 * The component is memoized and needs a useCallback over the onLocaleChange and
 * onClear props to prevent the Select from re-rendering N times when typing on a specific
 * key in a formik form
 */
const LocaleSelect = React.memo(({ value, onLocaleChange, error, onClear }) => {
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
    <Select
      startIcon={isLoading ? <SmallLoader>Loading the locales...</SmallLoader> : undefined}
      aria-busy={isLoading}
      label={formatMessage({
        id: getTrad('Settings.locales.modal.locales.label'),
        defaultMessage: 'Locales',
      })}
      onClear={value ? onClear : undefined}
      clearLabel={formatMessage({
        id: 'clearLabel',
        defaultMessage: 'Clear',
      })}
      error={error}
      value={computedValue}
      onChange={selectedLocaleKey => {
        const selectedLocale = options.find(locale => locale.value === selectedLocaleKey);

        if (selectedLocale) {
          onLocaleChange({ code: selectedLocale.value, displayName: selectedLocale.label });
        }
      }}
    >
      {isLoading
        ? null
        : options.map(option => (
          <Option value={option.value} key={option.value}>
            {option.label}
          </Option>
          ))}
    </Select>
  );
});

LocaleSelect.defaultProps = {
  error: undefined,
  value: undefined,
  onClear: () => undefined,
  onLocaleChange: () => undefined,
};

LocaleSelect.propTypes = {
  error: PropTypes.string,
  onClear: PropTypes.func,
  onLocaleChange: PropTypes.func,
  value: PropTypes.string,
};

export default LocaleSelect;
