import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Tooltip } from '@strapi/parts/Tooltip';
import { Text } from '@strapi/parts/Text';
import get from 'lodash/get';
import selectI18NLocales from '../../selectors/selectI18nLocales';

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

  const tooltipDescription = localesArray.map(name => (
    <React.Fragment key={name}>
      {name}
      <br />
    </React.Fragment>
  ));

  return (
    <Tooltip description={tooltipDescription}>
      <Text
        style={{ maxWidth: '252px', cursor: 'pointer' }}
        as="button"
        data-for={elId}
        data-tip={localesNames}
        textColor="neutral800"
        ellipsis
      >
        {localesNames}
      </Text>
    </Tooltip>
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
