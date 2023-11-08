import * as React from 'react';

import { Combobox, ComboboxOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import useDefaultLocales from '../../hooks/useDefaultLocales';
import useLocales from '../../hooks/useLocales';
import { getTrad } from '../../utils';

type LocaleSelectProps = {
  error?: string;
  onClear?: () => void;
  onLocaleChange: (locale: { code: string; displayName: string }) => void;
  value?: string;
};

/**
 * The component is memoized and needs a useCallback over the onLocaleChange and
 * onClear props to prevent the Select from re-rendering N times when typing on a specific
 * key in a formik form
 */
const LocaleSelect = ({
  value,
  onClear = () => {},
  onLocaleChange = () => {},
  error,
}: LocaleSelectProps) => {
  const { formatMessage } = useIntl();
  const { defaultLocales, isLoading } = useDefaultLocales();
  const { locales } = useLocales();

  const options = (defaultLocales || [])
    .map((locale: any) => ({
      label: locale.name,
      value: locale.code,
    }))
    .filter(({ value: v }: any) => {
      const foundLocale = locales.find(({ code }: any) => code === v);

      return !foundLocale || foundLocale.code === value;
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
      onClear={value ? onClear : undefined}
      onChange={(selectedLocaleKey) => {
        const selectedLocale = options.find((locale: any) => locale.value === selectedLocaleKey);

        if (selectedLocale) {
          onLocaleChange({ code: selectedLocale.value, displayName: selectedLocale.label });
        }
      }}
      placeholder={formatMessage({
        id: 'components.placeholder.select',
        defaultMessage: 'Select',
      })}
    >
      {options.map((option: any) => (
        <ComboboxOption value={option.value} key={option.value}>
          {option.label}
        </ComboboxOption>
      ))}
    </Combobox>
  );
};

export default React.memo(LocaleSelect);
