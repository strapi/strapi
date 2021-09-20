import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { Box } from '@strapi/parts/Box';
import { Divider } from '@strapi/parts/Divider';
import { Select, Option } from '@strapi/parts/Select';
import { TableLabel } from '@strapi/parts/Text';
import { Stack } from '@strapi/parts/Stack';
import { Row } from '@strapi/parts/Row';
import { useIntl } from 'react-intl';
import { useTheme } from 'styled-components';
import { useHistory } from 'react-router-dom';
import { stringify } from 'qs';
import { getTrad } from '../../../utils';
import { addStatusColorToLocale, createLocalesOption } from './utils';
import { statusMap } from './utils/addStatusColorToLocale';
import CMEditViewCopyLocale from '../CMEditViewCopyLocale';
import Bullet from './Bullet';

const CMEditViewLocalePicker = ({
  appLocales,
  createPermissions,
  currentEntityId,
  currentLocaleStatus,
  hasDraftAndPublishEnabled,
  isSingleType,
  localizations,
  query,
  readPermissions,
  setQuery,
  slug,
}) => {
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
      <TableLabel textColor="neutral600">
        {formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Internationalization' })}
      </TableLabel>
      <Box paddingTop={2} paddingBottom={6}>
        <Divider />
      </Box>
      <Stack size={2}>
        <Box>
          <Select
            label={formatMessage({
              id: getTrad('Settings.locales.modal.locales.label'),
            })}
            onChange={handleChange}
            value={value?.value}
          >
            <Option
              value={value.value}
              disabled
              startIcon={hasDraftAndPublishEnabled ? 'todo' : null}
            >
              <Row>
                {hasDraftAndPublishEnabled && (
                  <Bullet
                    $bulletColor={statusMap[currentLocaleStatus].backgroundColor}
                    borderColor={statusMap[currentLocaleStatus].borderColor}
                  />
                )}
                {value.label}
              </Row>
            </Option>
            {filteredOptions.map(option => {
              return (
                <Option key={option.value} value={option.value}>
                  <Row>
                    {hasDraftAndPublishEnabled && (
                      <Bullet
                        $bulletColor={option.backgroundColor}
                        borderColor={option.borderColor}
                      />
                    )}
                    {option.label}
                  </Row>
                </Option>
              );
            })}
          </Select>
        </Box>
        <Box>
          <CMEditViewCopyLocale
            appLocales={appLocales}
            currentLocale={currentLocale}
            localizations={localizations}
            readPermissions={readPermissions}
          />
        </Box>
      </Stack>
    </Box>
  );
};

CMEditViewLocalePicker.defaultProps = {
  createPermissions: [],
  currentEntityId: null,
  currentLocaleStatus: 'did-not-create-locale',
  isSingleType: false,
  localizations: [],
  query: {},
  readPermissions: [],
};

CMEditViewLocalePicker.propTypes = {
  appLocales: PropTypes.array.isRequired,
  createPermissions: PropTypes.array,
  currentEntityId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  currentLocaleStatus: PropTypes.string,
  hasDraftAndPublishEnabled: PropTypes.bool.isRequired,
  isSingleType: PropTypes.bool,
  localizations: PropTypes.array,
  query: PropTypes.object,
  readPermissions: PropTypes.array,
  setQuery: PropTypes.func.isRequired,
  slug: PropTypes.string.isRequired,
};

export default CMEditViewLocalePicker;
