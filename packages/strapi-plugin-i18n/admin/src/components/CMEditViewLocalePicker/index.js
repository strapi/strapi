import React from 'react';
import get from 'lodash/get';
import Select from 'react-select';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
import {
  BaselineAlignment,
  selectStyles,
  DropdownIndicator,
  useContentManagerEditViewDataManager,
  useQueryParams,
} from 'strapi-helper-plugin';
import { Label, Text, Padded } from '@buffetjs/core';
import { getTrad } from '../../utils';
import Wrapper from './Wrapper';

// TODO use the selector from the LocalePicker/selectors.js when PR merged
const selectI18NLocales = state => state.get('i18n_locales').locales;

const CMEditViewLocalePicker = () => {
  const { layout } = useContentManagerEditViewDataManager();
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const locales = useSelector(selectI18NLocales);
  const theme = useTheme();
  const hasI18nEnabled = get(layout, ['pluginOptions', 'i18n', 'localized'], false);

  if (!hasI18nEnabled) {
    return null;
  }

  const styles = selectStyles(theme);

  // TODO use localizations + RBAC when ready
  const options = locales.map(locale => ({ value: locale.code, label: locale.name }));
  const currentLocale = query.locale;
  const value = options.find(({ value }) => {
    return value === currentLocale;
  });

  return (
    <Wrapper>
      <BaselineAlignment top size="18px" />
      <Padded left right bottom size="smd">
        <Text fontWeight="bold">Internationalization</Text>
        <BaselineAlignment top size="18px" />
        <span id="select-locale">
          <Label htmlFor="">
            {formatMessage({
              id: getTrad('Settings.locales.modal.locales.label'),
            })}
          </Label>
        </span>
        <BaselineAlignment top size="3px" />
        <Select
          aria-labelledby="select-locale"
          options={options}
          onChange={({ value }) => {
            setQuery({ locale: value });
          }}
          isSearchable={false}
          components={{ DropdownIndicator }}
          styles={{
            ...styles,
            control: (base, state) => ({ ...base, ...styles.control(base, state), height: '34px' }),
            indicatorsContainer: (base, state) => ({
              ...base,
              ...styles.indicatorsContainer(base, state),
              height: '32px',
            }),
            valueContainer: base => ({
              ...base,
              padding: '2px 0px 4px 5px',
              lineHeight: '18px',
            }),
          }}
          value={value}
        />
      </Padded>
    </Wrapper>
  );
};

export default CMEditViewLocalePicker;
