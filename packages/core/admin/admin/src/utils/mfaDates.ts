/**
 * How every two-factor date-and-time reads: a grace deadline, a lock, a device's last use, a
 * security event. The time zone is named because the viewer and the user the date belongs to are
 * often in different ones, and a deadline that reads as 2:30 PM without saying where is ambiguous.
 * Spelled out in components because `Intl` refuses `timeZoneName` next to `dateStyle`/`timeStyle`.
 *
 * @internal
 */
export const MFA_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
};
