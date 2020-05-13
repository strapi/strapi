/* eslint-disable indent */
/* eslint-disable no-nested-ternary */

const styles = {
  control: (base, state) => {
    const borderStyle = state.selectProps.menuIsOpen
      ? {
          borderBottomLeftRadius: '0 !important',
          borderBottomRightRadius: '0 !important',
          borderBottom: '1px solid transparent !important',
        }
      : {};

    const {
      selectProps: { error, value },
    } = state;

    return {
      ...base,
      fontSize: 13,
      minHeight: 34,
      border: state.isFocused
        ? '1px solid #78caff !important'
        : // In order to avoir checking the form validations when modifying the Select we can
        // refer to value in order to know if the required validation passes
        error && value.length === 0
        ? '1px solid #f64d0a !important'
        : '1px solid #e3e9f3 !important',
      outline: 0,
      boxShadow: 0,
      borderRadius: '2px !important',
      ...borderStyle,
    };
  },
  menu: base => {
    return {
      ...base,
      width: 'calc(100% - 0px)',
      margin: '0',
      paddingTop: 0,
      borderRadius: '2px !important',
      borderTopLeftRadius: '0 !important',
      borderTopRightRadius: '0 !important',
      border: '1px solid #78caff !important',
      boxShadow: 0,
      borderTopColor: '#E3E9F3 !important',
      fontSize: '13px',
    };
  },
  menuList: base => ({
    ...base,
    paddingTop: 2,
  }),
  option: (base, state) => {
    return {
      ...base,
      height: 36,
      backgroundColor: state.isSelected ? '#fff' : base.backgroundColor,
      color: state.isSelected ? '#007eff' : '#333740',
      fontWeight: state.isSelected ? '600' : '400',
    };
  },
  placeholder: base => ({
    ...base,
    marginTop: 0,
    marginLeft: 8,
    color: '#aaa',
  }),
  valueContainer: base => ({
    ...base,
    padding: '2px 4px 4px 4px',
  }),
};

export default styles;
