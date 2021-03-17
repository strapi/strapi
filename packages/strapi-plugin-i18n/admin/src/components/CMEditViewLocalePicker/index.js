import React from 'react';
import PropTypes from 'prop-types';
import { Label, Text, Padded } from '@buffetjs/core';
import get from 'lodash/get';
import Select, { components } from 'react-select';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
import { BaselineAlignment, selectStyles, DropdownIndicator } from 'strapi-helper-plugin';
import { useHistory } from 'react-router-dom';
import { stringify } from 'qs';
import { getTrad } from '../../utils';
import { addStatusColorToLocale, createLocalesOption } from './utils';
import CMEditViewCopyLocale from '../CMEditViewCopyLocale';
import OptionComponent from './Option';
import Wrapper from './Wrapper';

const CMEditViewLocalePicker = ({
  appLocales,
  hasDraftAndPublishEnabled,
  localizations,
  query,
  currentEntityId,
  slug,
}) => {
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const currentLocale = get(query, 'plugins.i18n.locale', false);
  const { push } = useHistory();

  const handleChange = ({ status, value, id }) => {
    let defaultParams = {
      plugins: {
        ...query.plugins,
        i18n: { ...query.plugins.i18n, locale: value },
      },
    };

    if (currentEntityId) {
      defaultParams.plugins.i18n.relatedEntityId = currentEntityId;
    }

    if (status === 'did-not-create-locale') {
      push({
        pathname: `/plugins/content-manager/collectionType/${slug}/create`,
        search: stringify(defaultParams, { encode: false }),
      });

      return;
    }

    // TODO common field when switching from created => not created => created

    push({
      pathname: `/plugins/content-manager/collectionType/${slug}/${id}`,
      search: stringify(defaultParams, { encode: false }),
    });
  };

  const styles = selectStyles(theme);
  // TODO use localizations + RBAC when ready
  const options = addStatusColorToLocale(createLocalesOption(appLocales, localizations), theme);
  const filteredOptions = options.filter(({ value }) => value !== currentLocale);
  const value = options.find(({ value }) => {
    return value === currentLocale;
  });

  const Option = hasDraftAndPublishEnabled ? OptionComponent : components.Option;
  const paddingBottom = localizations.length ? '19px' : '29px';

  return (
    <Wrapper paddingBottom={paddingBottom}>
      <BaselineAlignment top size="18px" />
      <Padded left right size="smd">
        <Text fontWeight="bold">
          {formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Internationalization' })}
        </Text>
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
          options={filteredOptions}
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
        <CMEditViewCopyLocale
          appLocales={appLocales}
          currentLocale={currentLocale}
          localizations={localizations}
        />
      </Padded>
    </Wrapper>
  );
};

CMEditViewLocalePicker.defaultProps = {
  currentEntityId: null,
  localizations: [],
  query: {},
};

CMEditViewLocalePicker.propTypes = {
  appLocales: PropTypes.array.isRequired,
  currentEntityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hasDraftAndPublishEnabled: PropTypes.bool.isRequired,
  localizations: PropTypes.array,
  query: PropTypes.object,
  slug: PropTypes.string.isRequired,
};

export default CMEditViewLocalePicker;
