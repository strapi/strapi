import moment from 'moment';

const formatDuration = seconds => {
  const duration = moment('1900-01-01 00:00:00').add(seconds, 'seconds');

  if (seconds >= 3600) {
    return duration.format('HH:mm:ss');
  }

  return duration.format('mm:ss');
};

export default formatDuration;
