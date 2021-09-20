const statusMap = {
  'did-not-create-locale': {
    backgroundColor: 'neutral0',
    borderColor: 'neutral500',
  },
  draft: {
    backgroundColor: 'secondary700',
  },
  published: {
    backgroundColor: 'success700',
  },
};

const addStatusColorToLocale = locales =>
  locales.map(({ status, ...rest }) => {
    const props = statusMap[status];

    return {
      ...props,
      status,
      ...rest,
    };
  });

export default addStatusColorToLocale;
export { statusMap };
