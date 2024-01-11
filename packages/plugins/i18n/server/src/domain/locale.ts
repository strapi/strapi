const formatLocale = (locale: { name: string; code: string; isDefault: boolean }) => {
  return {
    ...locale,
    name: locale.name || null,
  };
};

export { formatLocale };
