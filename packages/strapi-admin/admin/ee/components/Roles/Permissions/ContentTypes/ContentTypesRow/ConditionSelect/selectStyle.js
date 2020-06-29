const selectStyle = {
  container: base => ({
    ...base,
    width: '70%',
    alignItems: 'center',
    height: '36px',
  }),
  menu: base => ({
    ...base,
    boxShadow: 'none',
    border: '1px solid #e3e9f3',
    borderRadius: '2px',
    marginTop: 0,
  }),
  menuList: base => ({
    ...base,
    paddingBottom: 9,
    paddingTop: 9,
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
  control: base => ({
    ...base,
    fontSize: 13,
    outline: 0,
    boxShadow: 0,
    borderRadius: '2px !important',
    height: 36,
    minHeight: 36,
    overflow: 'hidden',
    borderColor: '#e3e9f3',
    '&:hover': {
      borderColor: '#007eff',
    },
  }),
  valueContainer: base => ({
    ...base,
    padding: '2px 4px 4px 10px',
    lineHeight: '18px',
    minWidth: 200,
  }),
};

export default selectStyle;
