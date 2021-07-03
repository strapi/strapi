/* eslint-disable indent */
/* eslint-disable no-nested-ternary */

const styles = {
  container: base => ({ ...base, background: '#ffffff' }),
  control: (base, state) => {
    const borderRadiusStyle = state.selectProps.menuIsOpen
      ? {
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
        }
      : {};

    const {
      selectProps: { error, value },
    } = state;

    let border;
    let borderBottom;
    let backgroundColor;

    if (state.isFocused) {
      border = '1px solid #78caff !important';
    } else if (error && !value.length) {
      border = '1px solid #f64d0a !important';
    } else {
      border = '1px solid #e3e9f3 !important';
    }

    if (state.menuIsOpen === true) {
      borderBottom = '1px solid #e3e9f3 !important';
    }

    if (state.isDisabled) {
      backgroundColor = '#fafafb !important';
    }

    return {
      ...base,
      fontSize: 13,
      height: 34,
      minHeight: 34,
      border,
      outline: 0,
      boxShadow: 0,
      borderRadius: '2px !important',
      ...borderRadiusStyle,
      borderBottom,
      backgroundColor,
    };
  },
  input: base => ({ ...base, marginLeft: 10 }),
  menu: base => {
    return {
      ...base,
      width: '100%',
      margin: '0',
      paddingTop: 0,
      borderRadius: '2px !important',
      borderTopLeftRadius: '0 !important',
      borderTopRightRadius: '0 !important',
      border: '1px solid #78caff !important',
      boxShadow: 0,
      borderTop: '0 !important',
      fontSize: '13px',
    };
  },
  menuList: base => ({
    ...base,
    maxHeight: '112px',
    paddingTop: 2,
  }),
  option: (base, state) => {
    return {
      ...base,
      height: 36,
      backgroundColor: state.isFocused ? '#f6f6f6' : '#fff',
      ':active': {
        ...base[':active'],
        backgroundColor: '#f6f6f6',
      },
      color: '#333740',
      fontWeight: state.isFocused ? '600' : '400',
      cursor: 'pointer',
      WebkitFontSmoothing: 'antialiased',
    };
  },
  placeholder: base => ({
    ...base,
    marginTop: 0,
    marginLeft: 10,
    color: '#aaa',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    maxWidth: 'calc(100% - 32px)',
  }),
  valueContainer: base => ({
    ...base,
    padding: '2px 0px 4px 0px',
    lineHeight: '18px',
  }),
};

export default styles;
