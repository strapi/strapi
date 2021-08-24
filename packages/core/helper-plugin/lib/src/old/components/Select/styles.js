/* eslint-disable indent */
/* eslint-disable no-nested-ternary */

const getStyles = theme => {
  const { colors, fontWeights, sizes } = theme.main;

  // Colors that does not exist in the theme.main.colors
  const unknownLightGrey = `#f6f6f6`;
  const unknownGrey = `#aaa`;
  const unknownLightblue = `#78caff`;

  // Sizes that does not exist in the theme.main.sizes
  const unknownBorderSize1 = `1px`;
  const optionHeight = `36px`;
  const controlMinHeight = `34px`;

  return {
    container: base => ({
      ...base,
      width: '100%',
    }),
    control: (base, state) => {
      const {
        selectProps: { error, value },
      } = state;

      let border;
      let borderBottom;
      let backgroundColor;

      if (state.isFocused) {
        border = `${unknownBorderSize1} solid ${unknownLightblue} !important`;
      } else if (error && !value.length) {
        border = `${unknownBorderSize1} solid ${colors.lightOrange} !important`;
      } else {
        border = `${unknownBorderSize1} solid ${colors.border} !important`;
      }

      if (state.menuIsOpen === true) {
        borderBottom = `${unknownBorderSize1} solid ${colors.border} !important`;
      }

      if (state.isDisabled) {
        backgroundColor = `${colors.content.background} !important`;
      }

      return {
        ...base,
        fontSize: sizes.fonts.md,
        minHeight: controlMinHeight,
        border,
        outline: 0,
        boxShadow: 0,
        borderRadius: `${sizes.borderRadius} !important`,
        borderBottom,
        backgroundColor,
        width: '100%',
      };
    },
    menu: base => ({
      ...base,
      width: '100%',
      margin: '0',
      paddingTop: 0,
      borderRadius: `${sizes.borderRadius} !important`,
      borderTopLeftRadius: '0 !important',
      borderTopRightRadius: '0 !important',
      border: `${unknownBorderSize1} solid ${unknownLightblue} !important`,
      boxShadow: 0,
      borderTop: '0 !important',
      fontSize: sizes.fonts.md,
    }),
    menuList: base => ({
      ...base,
      maxHeight: '112px',
      paddingTop: sizes.borderRadius,
    }),
    option: (base, state) => ({
      ...base,
      height: optionHeight,

      backgroundColor: state.isFocused ? unknownLightGrey : colors.white,
      ':active': {
        ...base[':active'],
        backgroundColor: unknownLightGrey,
      },
      WebkitFontSmoothing: 'antialiased',
      color: colors.black,
      fontWeight: state.isFocused ? fontWeights.bold : fontWeights.regular,
      cursor: 'pointer',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    placeholder: base => ({
      ...base,
      marginTop: 0,
      color: unknownGrey,
    }),
    valueContainer: base => ({
      ...base,
      padding: '2px 10px 4px 10px', // These value don't exist in the theme
      fontSize: sizes.fonts.md,
      lineHeight: '18px',
    }),
    indicatorsContainer: base => ({
      ...base,
      width: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: colors.content.background,
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
  };
};

export default getStyles;
