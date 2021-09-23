import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Row } from '@strapi/parts/Row';
import { Box } from '@strapi/parts/Box';
import { IconButton } from '@strapi/parts/IconButton';
import { Text } from '@strapi/parts/Text';
import { Popover } from '@strapi/parts/Popover';
import { SortIcon, stopPropagation } from '@strapi/helper-plugin';
import get from 'lodash/get';
import selectI18NLocales from '../../selectors/selectI18nLocales';

const ActionWrapper = styled.span`
  svg {
    height: ${4 / 16}rem;
  }
`;

const mapToLocaleName = (locales, localeCode) =>
  get(
    locales.find(({ code }) => code === localeCode),
    'name',
    localeCode
  );

const LocaleListCell = ({ localizations, locale: currentLocaleCode, id }) => {
  const locales = useSelector(selectI18NLocales);
  const allLocalizations = [{ locale: currentLocaleCode }, ...localizations];
  const localizationNames = allLocalizations.map(locale => locale.locale);
  const defaultLocale = locales.find(locale => locale.isDefault);
  const hasDefaultLocale = localizationNames.includes(defaultLocale.code);
  const [visible, setVisible] = useState(false);
  const buttonRef = useRef();
  const { formatMessage } = useIntl();

  let localesArray = [];

  if (hasDefaultLocale) {
    const ctLocalesWithoutDefault = localizationNames.filter(
      locale => locale !== defaultLocale.code
    );
    const ctLocalesNamesWithoutDefault = ctLocalesWithoutDefault.map(locale =>
      mapToLocaleName(locales, locale)
    );

    ctLocalesNamesWithoutDefault.sort();

    const ctLocalesNamesWithDefault = [
      `${defaultLocale.name} (default)`,
      ...ctLocalesNamesWithoutDefault,
    ];

    localesArray = ctLocalesNamesWithDefault;
  } else {
    const ctLocales = localizationNames.map(locale => mapToLocaleName(locales, locale));
    ctLocales.sort();

    localesArray = ctLocales;
  }

  const handleTogglePopover = () => setVisible(prev => !prev);

  const elId = `entry-${id}__locale`;
  const localesNames = localesArray.join(', ');

  return (
    <Row {...stopPropagation}>
      <Text
        style={{ maxWidth: '252px', cursor: 'pointer' }}
        data-for={elId}
        data-tip={localesNames}
        textColor="neutral800"
        ellipsis
      >
        {localesNames}
      </Text>
      <ActionWrapper>
        <IconButton
          onClick={handleTogglePopover}
          ref={buttonRef}
          noBorder
          label={formatMessage({
            id: 'CMListView.popover.display-locales.label',
            defaultMessage: 'Display translated locales',
          })}
          icon={<SortIcon />}
        />
        {visible && (
          <Popover source={buttonRef} spacing={16} centered>
            <ul>
              {localesArray.map(name => (
                <Box key={name} padding={3} as="li">
                  <Text>{name}</Text>
                </Box>
              ))}
            </ul>
          </Popover>
        )}
      </ActionWrapper>
    </Row>
  );
};

LocaleListCell.propTypes = {
  id: PropTypes.number.isRequired,
  localizations: PropTypes.arrayOf(
    PropTypes.shape({
      locale: PropTypes.string.isRequired,
    })
  ).isRequired,
  locale: PropTypes.string.isRequired,
};

export default LocaleListCell;
