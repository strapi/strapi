import { Combobox, ComboboxOption, ComboboxProps } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { ISOLocale } from '../../../shared/contracts/iso-locales';
import { useDefaultLocales } from '../hooks/useDefaultLocales';
import { useLocales } from '../hooks/useLocales';
import { getTranslation } from '../utils/getTranslation';

interface LocaleSelectProps extends Pick<ComboboxProps, 'onClear' | 'error' | 'value'> {
  onLocaleChange: (locale: ISOLocale) => void;
}

/**
 * The component is memoized and needs a useCallback over the onLocaleChange and
 * onClear props to prevent the Select from re-rendering N times when typing on a specific
 * key in a formik form
 */
const LocaleSelect = ({ value, onClear, onLocaleChange, error }: LocaleSelectProps) => {
  const { formatMessage } = useIntl();
  const { defaultLocales = [], isLoading } = useDefaultLocales();
  const { locales } = useLocales();

  const options = defaultLocales
    .map((locale) => ({
      label: locale.name,
      value: locale.code,
    }))
    .filter((opt) => {
      const foundLocale = locales.find(({ code }) => code === opt.value);
      return !foundLocale || foundLocale.code === value;
    });

  const computedValue = value || '';

  return (
    <Combobox
      aria-busy={isLoading}
      error={error}
      label={formatMessage({
        id: getTranslation('Settings.locales.modal.locales.label'),
        defaultMessage: 'Locales',
      })}
      value={computedValue}
      onClear={onClear}
      onChange={(selectedLocaleKey) => {
        const selectedLocale = options.find((locale) => locale.value === selectedLocaleKey);

        if (selectedLocale) {
          onLocaleChange({ code: selectedLocale.value, name: selectedLocale.label });
        }
      }}
      placeholder={formatMessage({
        id: 'components.placeholder.select',
        defaultMessage: 'Select',
      })}
    >
      {options.map((option) => (
        <ComboboxOption value={option.value} key={option.value}>
          {option.label}
        </ComboboxOption>
      ))}
    </Combobox>
  );
};

export { LocaleSelect };
export type { LocaleSelectProps };
