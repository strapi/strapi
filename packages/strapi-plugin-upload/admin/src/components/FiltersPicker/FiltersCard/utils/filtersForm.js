import { dateToUtcTime } from 'strapi-helper-plugin';
import moment from 'moment';

const filtersForm = {
  created_at: {
    type: 'datetime',
    defaultFilter: '=',
    defaultValue: dateToUtcTime(moment()),
  },
  updated_at: {
    type: 'datetime',
    defaultFilter: '=',
    defaultValue: dateToUtcTime(moment()),
  },
  size: {
    type: 'integer',
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
