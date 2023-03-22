const generateOptions = (options, isRequired = false) => {
  return [
    {
      metadatas: {
        intlLabel: {
          id: 'components.InputSelect.option.placeholder',
          defaultMessage: 'Choose here',
        },
        disabled: isRequired,
        hidden: isRequired,
      },
      key: '__enum_option_null',
      value: '',
    },
    ...options.map((option) => {
      return {
        metadatas: {
          intlLabel: {
            id: option,
            defaultMessage: option,
          },
          hidden: false,
          disabled: false,
        },
        key: option,
        value: option,
      };
    }),
  ];
};

export default generateOptions;
