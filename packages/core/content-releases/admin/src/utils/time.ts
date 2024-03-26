export const getTimezoneOffset = (timezone: string, date: Date) => {
  try {
    const offsetPart = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName');

    const offset = offsetPart ? offsetPart.value : '';

    // We want to show time based on UTC, not GMT so we swap that.
    let utcOffset = offset.replace('GMT', 'UTC');

    // For perfect UTC (UTC+0:00) we only get the string UTC, So we need to append the 0's.
    if (!utcOffset.includes('+') && !utcOffset.includes('-')) {
      utcOffset = `${utcOffset}+00:00`;
    }

    return utcOffset;
  } catch (error) {
    // When timezone is invalid we catch the error and return empty to don't break the app
    return '';
  }
};
