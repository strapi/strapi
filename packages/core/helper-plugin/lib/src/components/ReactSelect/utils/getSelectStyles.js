const getSelectStyles = (theme, error) => {
  return {
    clearIndicator: base => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    container: base => ({
      ...base,
      background: theme.colors.neutral0,
      lineHeight: 'normal',
    }),
    control: (base, state) => {
      let border = `1px solid ${theme.colors.neutral200} !important`;
      let backgroundColor;

      if (state.isFocused) {
        border = `1px solid ${theme.colors.primary200} !important`;
      } else if (error) {
        border = `1px solid ${theme.colors.danger600} !important`;
      }

      if (state.isDisabled) {
        backgroundColor = `${theme.colors.neutral150} !important`;
      }

      return {
        ...base,
        fontSize: 14,
        height: 40,
        border,
        outline: 0,
        boxShadow: 0,
        borderRadius: '2px !important',
        backgroundColor,
        borderTopLeftRadius: '4px !important',
        borderTopRightRadius: '4px !important',
        borderBottomLeftRadius: '4px !important',
        borderBottomRightRadius: '4px !important',
      };
    },
    indicatorContainer: base => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    input: base => ({ ...base, margin: 0, padding: 0, color: theme.colors.neutral800 }),
    menu: base => {
      return {
        ...base,
        width: '100%',
        marginTop: theme.spaces[1],
        backgroundColor: theme.colors.neutral0,
        color: theme.colors.neutral800,
        borderRadius: '4px !important',
        borderTopLeftRadius: '4px !important',
        borderTopRightRadius: '4px !important',
        border: `1px solid ${theme.colors.neutral200} !important`,
        boxShadow: 0,
        fontSize: '14px',
        zIndex: 2,
      };
    },
    menuList: base => ({
      ...base,
      paddingLeft: theme.spaces[1],
      paddingTop: theme.spaces[1],
      paddingRight: theme.spaces[1],
      paddingBottom: theme.spaces[1],
    }),
    menuPortal: base => ({
      ...base,
      zIndex: 100,
    }),
    option: (base, state) => {
      let backgroundColor = base.backgroundColor;

      if (state.isFocused || state.isSelected) {
        backgroundColor = theme.colors.primary100;
      }

      return {
        ...base,
        lineHeight: theme.spaces[5],
        backgroundColor,
        borderRadius: theme.borderRadius,
        '&:active': {
          backgroundColor: theme.colors.primary100,
        },
      };
    },
    placeholder: base => ({ ...base, marginLeft: 0 }),
    singleValue: (base, state) => {
      let color = theme.colors.neutral800;

      if (state.isDisabled) {
        color = theme.colors.neutral600;
      }

      return { ...base, marginLeft: 0, color };
    },
    valueContainer: base => ({
      ...base,
      padding: 0,
      paddingLeft: theme.spaces[4],
      marginLeft: 0,
      marginRight: 0,
    }),
  };
};

export default getSelectStyles;
