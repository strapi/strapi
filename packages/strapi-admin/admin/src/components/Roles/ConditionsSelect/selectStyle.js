/* eslint-disable indent */
/* eslint-disable no-nested-ternary */

const selectStyle = {
  container: base => ({
    ...base,
    width: '70%',
    alignItems: 'center',
    height: '36px',
  }),
  menu: base => ({
    ...base,
    margin: '0',
    paddingTop: 0,
    borderRadius: '2px !important',
    borderTopLeftRadius: '0 !important',
    borderTopRightRadius: '0 !important',
    border: '1px solid #78caff !important',
    boxShadow: 0,
    borderTop: '0 !important',
    fontSize: '13px',
  }),
  menuList: base => ({
    ...base,
    paddingBottom: 9,
    paddingTop: 10,
  }),
  multiValue: base => ({
    ...base,
    backgroundColor: 'none',
    color: '#333740',
  }),
  multiValueLabel: base => ({
    ...base,
    fontSize: '13px',
  }),
  multiValueRemove: base => ({
    ...base,
    display: 'none',
  }),

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

    return {
      ...base,
      fontSize: 13,
      minHeight: 34,
      top: '1px',
      border,
      outline: 0,
      boxShadow: 0,
      borderRadius: '2px !important',
      ...borderRadiusStyle,
      borderBottom,
    };
  },
  valueContainer: base => ({
    ...base,
    padding: '2px 4px 4px 10px',
    lineHeight: '18px',
    minWidth: 200,
  }),
  placeholder: base => ({
    ...base,
    paddingTop: 1,
    color: 'black',
  }),
};

export default selectStyle;
