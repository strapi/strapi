const filtersForm = {
  created_at: {
    type: 'datetime',
  },
  updated_at: {
    type: 'datetime',
  },
  size: {
    type: 'size',
  },
  file_type: {
    type: 'enum',
  },
};

export default filtersForm;
