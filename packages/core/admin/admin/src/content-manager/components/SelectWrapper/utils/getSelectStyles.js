// const styles = {
//   container: base => ({ ...base, background: '#ffffff' }),
// control: (base, state) => {
//   const borderRadiusStyle = state.selectProps.menuIsOpen
//     ? {
//         borderBottomLeftRadius: '0 !important',
//         borderBottomRightRadius: '0 !important',
//       }
//     : {};

//   const {
//     selectProps: { error, value },
//   } = state;

//   let border;
//   let borderBottom;
//   let backgroundColor;

//   if (state.isFocused) {
//     border = '1px solid #78caff !important';
//   } else if (error && !value.length) {
//     border = '1px solid #f64d0a !important';
//   } else {
//     border = '1px solid #e3e9f3 !important';
//   }

//   if (state.menuIsOpen === true) {
//     borderBottom = '1px solid #e3e9f3 !important';
//   }

//   if (state.isDisabled) {
//     backgroundColor = '#fafafb !important';
//   }

//   return {
//     ...base,
//     fontSize: 13,
//     height: 34,
//     minHeight: 34,
//     border,
//     outline: 0,
//     boxShadow: 0,
//     borderRadius: '2px !important',
//     ...borderRadiusStyle,
//     borderBottom,
//     backgroundColor,
//   };
// },
//   input: base => ({ ...base, marginLeft: 10 }),
//   menu: base => {
//     return {
//       ...base,
//       width: '100%',
//       margin: '0',
//       paddingTop: 0,
//       borderRadius: '2px !important',
//       borderTopLeftRadius: '0 !important',
//       borderTopRightRadius: '0 !important',
//       border: '1px solid #78caff !important',
//       boxShadow: 0,
//       borderTop: '0 !important',
//       fontSize: '13px',
//     };
//   },
//   menuList: base => ({
//     ...base,
//     maxHeight: '112px',
//     paddingTop: 2,
//   }),
//   option: (base, state) => {
//     return {
//       ...base,
//       height: 36,
//       backgroundColor: state.isFocused ? '#f6f6f6' : '#fff',
//       ':active': {
//         ...base[':active'],
//         backgroundColor: '#f6f6f6',
//       },
//       color: '#333740',
//       fontWeight: state.isFocused ? '600' : '400',
//       cursor: 'pointer',
//       WebkitFontSmoothing: 'antialiased',
//     };
//   },
//   placeholder: base => ({
//     ...base,
//     marginTop: 0,
//     marginLeft: 10,
//     color: '#aaa',
//     overflow: 'hidden',
//     whiteSpace: 'nowrap',
//     textOverflow: 'ellipsis',
//     maxWidth: 'calc(100% - 32px)',
//   }),
//   valueContainer: base => ({
//     ...base,
//     padding: '2px 0px 4px 0px',
//     lineHeight: '18px',
//   }),
// };

// export default styles;

const getSelectStyles = theme => {
  return {
    clearIndicator: base => ({ ...base, padding: 0, paddingRight: theme.spaces[3] }),
    container: base => ({
      ...base,
      background: theme.colors.neutral0,
      fontFamily: 'Arial',
      lineHeight: 'normal',
    }),
    control: (base, state) => {
      let border;
      let borderBottom;
      let backgroundColor;

      if (state.isFocused) {
        border = `1px solid ${theme.colors.primary600} !important`;
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
    input: base => ({ ...base, margin: 0, padding: 0 }),
    menu: base => {
      return {
        ...base,
        width: '100%',
        marginTop: theme.spaces[1],
        borderRadius: '4px !important',
        borderTopLeftRadius: '4px !important',
        borderTopRightRadius: '4px !important',
        border: `1px solid ${theme.colors.neutral200} !important`,
        boxShadow: 0,
        fontSize: '14px',
        fontFamily: 'Arial',
      };
    },
    menuList: base => ({
      ...base,
      paddingLeft: theme.spaces[1],
      paddingTop: theme.spaces[1],
      paddingRight: theme.spaces[1],
      paddingBottom: theme.spaces[1],
    }),
    option: (base, state) => {
      let backgroundColor = base.backgroundColor;

      if (state.isFocused) {
        backgroundColor = theme.colors.primary100;
      }

      return { ...base, lineHeight: theme.spaces[5], backgroundColor, borderRadius: 4 };
    },
    singleValue: base => ({ ...base, marginLeft: 0 }),
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
