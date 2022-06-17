import { intervalToDuration } from 'date-fns';

const zeroPad = num => String(num).padStart(2, '0');

export const formatDuration = durationInSecond => {
  const duration = intervalToDuration({ start: 0, end: durationInSecond * 1000 });

  return `${zeroPad(duration.hours)}:${zeroPad(duration.minutes)}:${zeroPad(duration.seconds)}`;
};
