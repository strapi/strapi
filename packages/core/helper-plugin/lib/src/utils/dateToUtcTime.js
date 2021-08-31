import moment from 'moment';

const dateToUtcTime = date => moment.parseZone(date).utc();

export default dateToUtcTime;
