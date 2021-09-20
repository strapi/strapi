import React from 'react';
import PropTypes from 'prop-types';
// import { Label, Text, Padded } from '@buffetjs/core';
import get from 'lodash/get';
// import Select, { components } from 'react-select';
import { Box } from '@strapi/parts/Box';
import { Divider } from '@strapi/parts/Divider';
import { Select, Option } from '@strapi/parts/Select';
import { Text } from '@strapi/parts/Text';
// import { Row } from '@strapi/parts/Row';
import { Stack } from '@strapi/parts/Stack';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
// import { DropdownIndicator, BaselineAlignment, selectStyles } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import { stringify } from 'qs';
import { getTrad } from '../../utils';
import { addStatusColorToLocale, createLocalesOption } from './utils';
// import CMEditViewCopyLocale from '../CMEditViewCopyLocale';
// import OptionComponent from './Option';
// import Wrapper from './Wrapper';

const CMEditViewLocalePicker = ({
  appLocales,
  createPermissions,
  currentEntityId,
  hasDraftAndPublishEnabled,
  isSingleType,
  localizations,
  query,
  readPermissions,
  setQuery,
  slug,
}) => {
  console.log(hasDraftAndPublishEnabled);
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const currentLocale = get(query, 'plugins.i18n.locale', false);
  const { push } = useHistory();

  const handleChange = value => {
    if (value === currentLocale) {
      return;
    }

    const nextLocale = options.find(option => {
      return option.value === value;
    });

    const { status, id } = nextLocale;

    let defaultParams = {
      plugins: {
        ...query.plugins,
        i18n: { ...query.plugins.i18n, locale: value },
      },
    };

    if (currentEntityId) {
      defaultParams.plugins.i18n.relatedEntityId = currentEntityId;
    }

    if (isSingleType) {
      setQuery(defaultParams);

      return;
    }

    if (status === 'did-not-create-locale') {
      push({
        pathname: `/content-manager/collectionType/${slug}/create`,
        search: stringify(defaultParams, { encode: false }),
      });

      return;
    }

    push({
      pathname: `/content-manager/collectionType/${slug}/${id}`,
      search: stringify(defaultParams, { encode: false }),
    });
  };

  const options = addStatusColorToLocale(
    createLocalesOption(appLocales, localizations),
    theme
  ).filter(({ status, value }) => {
    if (status === 'did-not-create-locale') {
      return createPermissions.find(({ properties }) =>
        get(properties, 'locales', []).includes(value)
      );
    }

    return readPermissions.find(({ properties }) => get(properties, 'locales', []).includes(value));
  });
  const filteredOptions = options.filter(({ value }) => value !== currentLocale);
  const value = options.find(({ value }) => {
    return value === currentLocale;
  });

  return (
    <Box paddingTop={6}>
      <Text textColor="neutral600" bold style={{ textTransform: 'uppercase' }} small>
        {formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Internationalization' })}
      </Text>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack size={2}>
        <Select
          label={formatMessage({
            id: getTrad('Settings.locales.modal.locales.label'),
          })}
          onChange={handleChange}
          value={value.value}
        >
          <Option value={value.value} disabled>
            {value.label}
          </Option>
          {filteredOptions.map(option => {
            return (
              <Option key={option.value} value={option.value}>
                {option.label}
              </Option>
            );
          })}
        </Select>
      </Stack>
    </Box>
  );
  // return 'todo';

  // const styles = selectStyles(theme);
  // const Option = hasDraftAndPublishEnabled ? OptionComponent : components.Option;
  // const paddingBottom = localizations.length ? '19px' : '29px';

  // return (
  //   <Wrapper paddingBottom={paddingBottom}>
  //     <BaselineAlignment top size="18px" />
  //     <Padded left right size="smd">
  //       <Text fontWeight="bold">
  //         {formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Internationalization' })}
  //       </Text>
  //       <BaselineAlignment top size="18px" />
  //       <span id="select-locale">
  //         <Label htmlFor="">
  //           {formatMessage({
  //             id: getTrad('Settings.locales.modal.locales.label'),
  //           })}
  //         </Label>
  //       </span>
  //       <BaselineAlignment top size="3px" />
  //       <Select
  //         aria-labelledby="select-locale"
  //         components={{ DropdownIndicator, Option }}
  //         isSearchable={false}
  //         onChange={handleChange}
  //         options={filteredOptions}
  //         styles={{
  //           ...styles,
  //           control: (base, state) => ({ ...base, ...styles.control(base, state), height: '34px' }),
  //           indicatorsContainer: (base, state) => ({
  //             ...base,
  //             ...styles.indicatorsContainer(base, state),
  //             height: '32px',
  //           }),
  //           valueContainer: base => ({
  //             ...base,
  //             padding: '2px 0px 4px 10px',
  //             lineHeight: '18px',
  //           }),
  //         }}
  //         value={value}
  //       />
  //       <CMEditViewCopyLocale
  //         appLocales={appLocales}
  //         currentLocale={currentLocale}
  //         localizations={localizations}
  //         readPermissions={readPermissions}
  //       />
  //     </Padded>
  //   </Wrapper>
  // );
};

CMEditViewLocalePicker.defaultProps = {
  createPermissions: [],
  currentEntityId: null,
  isSingleType: false,
  localizations: [],
  query: {},
  readPermissions: [],
};

CMEditViewLocalePicker.propTypes = {
  appLocales: PropTypes.array.isRequired,
  createPermissions: PropTypes.array,
  currentEntityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  hasDraftAndPublishEnabled: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool,
  localizations: PropTypes.array,
  query: PropTypes.object,
  readPermissions: PropTypes.array,
  setQuery: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default CMEditViewLocalePicker;
