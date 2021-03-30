import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from '@buffetjs/styles';

const mapToLocaleName = (locales, localeCode) =>
  locales.find(({ code }) => code === localeCode).name;

const LocaleListCell = ({ locales, localizations, locale: currentLocaleCode, id }) => {
  const allLocalizations = [{ locale: currentLocaleCode }, ...localizations];
  const localizationNames = allLocalizations.map(locale => locale.locale);
  const defaultLocale = locales.find(locale => locale.isDefault);
  const hasDefaultLocale = localizationNames.includes(defaultLocale.code);

  let localesNames;

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

    localesNames = ctLocalesNamesWithDefault.join(', ');
  } else {
    const ctLocales = localizationNames.map(locale => mapToLocaleName(locales, locale));
    ctLocales.sort();

    localesNames = ctLocales.join(', ');
  }

  const elId = `entry-${id}__locale`;

  return (
    <div>
      <span data-for={elId} data-tip={localesNames}>
        {localesNames}
      </span>
      <Tooltip id={elId} place="top" delay={0} />
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
