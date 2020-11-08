import moment from 'moment';
import { unformatBytes } from '../../../utils';

const formatFilter = filter => {
  const { name, value } = filter;

  if (value._isAMomentObject === true) {
    return { ...filter, value: moment(value).format() };
  }

  if (name === 'size') {
    return { ...filter, value: unformatBytes(value) };
  }

  return filter;
};

export default formatFilter;
