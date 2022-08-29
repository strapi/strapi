import get from 'lodash/get';

const generateOptions = (appLocales, currentLocale, localizations, permissions) => {
  return appLocales
    .filter(({ code }) => {
      return (
        code !== currentLocale &&
        (localizations || []).findIndex(({ locale }) => locale === code) !== -1
      );
    })
    .filter(({ code }) => {
      return permissions.some(({ properties }) => get(properties, 'locales', []).includes(code));
    })
    .map((locale) => {
      return {
        label: locale.name,
        value: localizations.find((loc) => locale.code === loc.locale).id,
      };
    });
};

export default generateOptions;
