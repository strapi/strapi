const addStatusColorToLocale = (locales, theme) =>
  locales.map(({ status, ...rest }) => {
    const statusMap = {
      'did-not-create-locale': {
        backgroundColor: theme.colors.neutral0,
        border: `1px solid ${theme.colors.neutral300}`,
      },
      draft: {
        backgroundColor: theme.colors.secondary700,
      },
      published: {
        backgroundColor: theme.colors.success700,
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
