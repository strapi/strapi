const addStatusColorToLocale = (locales, theme) =>
  locales.map(({ status, ...rest }) => {
    const statusMap = {
      'did-not-create-locale': {
        backgroundColor: theme.main.colors.white,
        border: `1px solid ${theme.main.colors.grey}`,
      },
      draft: {
        backgroundColor: theme.main.colors.mediumBlue,
      },
      published: {
        backgroundColor: theme.main.colors.green,
      },
    };
    const props = statusMap[status];

    return {
      ...props,
      status,
      ...rest,
    };
  });

export default addStatusColorToLocale;
