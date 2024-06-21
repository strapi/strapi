import { getTimezoneOffset } from './time';

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
