const getSelectStyles = (theme, { 'aria-errormessage': error }) => {
  return {
    clearIndicator: base => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    container: base => ({
      ...base,
      background: theme.colors.neutral0,
      lineHeight: 'normal',
    }),
    control: (base, state) => {
      let border;
      let borderBottom;
      let backgroundColor;

      if (state.isFocused) {
        border = `1px solid ${theme.colors.primary600} !important`;
      } else if (error) {
        border = `1px solid ${theme.colors.danger600} !important`;
      } else {
        border = `1px solid ${theme.colors.neutral200} !important`;
      }

      if (state.menuIsOpen === true) {
        borderBottom = `1px solid ${theme.colors.primary600} !important`;
      }

      if (state.isDisabled) {
        backgroundColor = '#fafafb !important';
      }

      return {
        ...base,
        fontSize: 14,
        height: 40,
        border,
        outline: 0,
        boxShadow: 0,
        borderRadius: '2px !important',
        borderBottom,
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

      return { ...base, lineHeight: theme.spaces[5], backgroundColor, borderRadius: 4 };
    },
    placeholder: base => ({ ...base, marginLeft: 0 }),
    singleValue: base => ({ ...base, marginLeft: 0, color: theme.colors.neutral800 }),
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
