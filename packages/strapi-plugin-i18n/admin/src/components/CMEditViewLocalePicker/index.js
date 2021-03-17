import React from 'react';
import PropTypes from 'prop-types';
import { Label, Text, Padded } from '@buffetjs/core';
import get from 'lodash/get';
import Select, { components } from 'react-select';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
import { BaselineAlignment, selectStyles, DropdownIndicator } from 'strapi-helper-plugin';
import { getTrad } from '../../utils';
import {
  addStatusColorToLocale,
  checkIfDataHasDraftAndPublish,
  createLocalesOption,
} from './utils';
import OptionComponent from './Option';
import Wrapper from './Wrapper';

const CMEditViewLocalePicker = ({ appLocales, localizations, query, setQuery }) => {
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const hasDraftAndPublish = checkIfDataHasDraftAndPublish(localizations);
  const currentLocale = get(query, 'plugins.i18n.locale', false);

  const handleChange = ({ value }) => {
    setQuery({
      plugins: {
        ...query.plugins,
        i18n: {
          ...query.plugins.i18n,
          locale: value,
        },
      },
    });
  };

  const styles = selectStyles(theme);
  // TODO use localizations + RBAC when ready
  const options = addStatusColorToLocale(createLocalesOption(appLocales, localizations), theme);
  const value = options.find(({ value }) => {
    return value === currentLocale;
  });

  const Option = hasDraftAndPublish ? OptionComponent : components.Option;

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
          components={{ DropdownIndicator, Option }}
          isSearchable={false}
          onChange={handleChange}
          options={options}
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
              padding: '2px 0px 4px 10px',
              lineHeight: '18px',
            }),
          }}
          value={value}
        />
      </Padded>
    </Wrapper>
  );
};

CMEditViewLocalePicker.defaultProps = {
  localizations: [],
  query: {},
};

CMEditViewLocalePicker.propTypes = {
  appLocales: PropTypes.array.isRequired,
  localizations: PropTypes.array,
  query: PropTypes.object,
  setQuery: PropTypes.func.isRequired,
};

export default CMEditViewLocalePicker;
