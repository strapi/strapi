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

interface ITimezoneOption {
  offset: string;
  value: string;
}

export const getTimezones = (selectedDate: Date) => {
  const timezoneList: ITimezoneOption[] = Intl.supportedValuesOf('timeZone').map((timezone) => {
    // Timezone will be in the format GMT${OFFSET} where offset could be nothing,
    // a four digit string e.g. +05:00 or -08:00
    const utcOffset = getTimezoneOffset(timezone, selectedDate);

    // Offset and timezone are concatenated with '&', so to split and save the required timezone in DB
    return { offset: utcOffset, value: `${utcOffset}&${timezone}` } satisfies ITimezoneOption;
  });

  const systemTimezone = timezoneList.find(
    (timezone) => timezone.value.split('&')[1] === Intl.DateTimeFormat().resolvedOptions().timeZone
  );

  return { timezoneList, systemTimezone };
};
