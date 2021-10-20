import React from 'react';
import PropTypes from 'prop-types';
import { Padded, Text } from '@buffetjs/core';
import { Tooltip } from '@buffetjs/styles';
import get from 'lodash/get';
import styled from 'styled-components';

const mapToLocaleName = (locales, localeCode) =>
  get(
    locales.find(({ code }) => code === localeCode),
    'name',
    localeCode
  );

const LocaleName = styled.div`
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
`;

const LocaleListCell = ({ locales, localizations, locale: currentLocaleCode, id }) => {
  const allLocalizations = [{ locale: currentLocaleCode }, ...localizations];
  const localizationNames = allLocalizations.map(locale => locale.locale);
  const defaultLocale = locales.find(locale => locale.isDefault);
  const hasDefaultLocale = localizationNames.includes(defaultLocale.code);

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

  const elId = `entry-${id}__locale`;
  const localesNames = localesArray.join(', ');

  return (
    <div>
      <LocaleName data-for={elId} data-tip={localesNames}>
        {localesNames}
      </LocaleName>
      <Tooltip id={elId} place="bottom" delay={0}>
        {localesArray.map(name => (
          <Padded key={name} top bottom size="xs">
            <Text ellipsis color="white">
              {name}
            </Text>
          </Padded>
        ))}
      </Tooltip>
    </div>
  );
};

LocaleListCell.propTypes = {
  id: PropTypes.number.isRequired,
  localizations: PropTypes.arrayOf(
    PropTypes.shape({
      locale: PropTypes.string.isRequired,
    })
  ).isRequired,
  locales: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      code: PropTypes.string.isRequired,
      isDefault: PropTypes.bool,
    })
  ).isRequired,
  locale: PropTypes.string.isRequired,
};

export default LocaleListCell;
