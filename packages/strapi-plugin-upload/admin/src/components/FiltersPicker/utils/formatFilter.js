import moment from 'moment';

const formatFilter = filter => {
  const { value } = filter;

  if (value._isAMomentObject === true) {
    return { ...filter, value: moment(value).format() };
  }

  return filter;
};

export default formatFilter;
