import moment from 'moment';

const filtersForm = {
  created_at: {
    type: 'datetime',
    defaultValue: moment(),
  },
  updated_at: {
    type: 'datetime',
    defaultValue: moment(),
  },
  size: {
    type: 'size',
    defaultValue: {
      size: 0,
      format: 'KB',
    },
  },
  file_type: {
    type: 'enum',
    defaultValue: 'image',
  },
};

export default filtersForm;
