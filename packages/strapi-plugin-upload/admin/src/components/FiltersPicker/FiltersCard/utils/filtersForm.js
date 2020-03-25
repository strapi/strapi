import moment from 'moment';

const filtersForm = {
  created_at: {
    type: 'datetime',
    defaultFilter: '=',
    defaultValue: moment(),
  },
  updated_at: {
    type: 'datetime',
    defaultFilter: '=',
    defaultValue: moment(),
  },
  size: {
    type: 'size',
    defaultFilter: '=',
    defaultValue: '0KB',
  },
  mime: {
    type: 'enum',
    defaultFilter: '_contains',
    defaultValue: 'image',
  },
};

export default filtersForm;
