import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
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

const mapToLocaleName = (locales, localeCode) =>
  locales.find(({ code }) => code === localeCode).name;

const LocaleListCell = ({ locales, locale: localCode, localizations }) => {
  const localizationNames = localizations.map(locale => locale.locale);
  const allLocalesWithoutActual = localizationNames.filter(locale => locale !== localCode);
  const defaultLocale = locales.find(locale => locale.isDefault);
  const hasDefaultLocale = allLocalesWithoutActual.includes(defaultLocale.code);

  if (hasDefaultLocale) {
    const ctLocalesWithoutDefault = allLocalesWithoutActual.filter(locale => locale !== defaultLocale.code);
    const ctLocalesNamesWithoutDefault = ctLocalesWithoutDefault.map(locale =>
      mapToLocaleName(locales, locale)
    );

    ctLocalesNamesWithoutDefault.sort()

    const ctLocalesNamesWithDefault = [
      `${defaultLocale.name} (default)`,
      ...ctLocalesNamesWithoutDefault,
    ];

    return <span>{ctLocalesNamesWithDefault.join(', ')}</span>;
  }

  const ctLocales = allLocalesWithoutActual.map(locale => mapToLocaleName(locales, locale));
  ctLocales.sort()

  return <span>{ctLocales.join(', ')}</span>;
};

LocaleListCell.propTypes = propTypes;
export default LocaleListCell;
