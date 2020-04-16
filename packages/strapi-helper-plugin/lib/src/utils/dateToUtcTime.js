import moment from 'moment';

const dateToUtcTime = date => moment(date).utc();

export default dateToUtcTime;
