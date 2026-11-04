import * as React from 'react';

/**
 * TEMPORARY local icons for the Releases schedule column.
 *
 * `calendar-blank` and `paper-plane-tilt` (Phosphor regular) are not yet in
 * `@strapi/icons`. Replace with imports from `@strapi/icons/regular` once a dev
 * task adds them there following EE-274 (https://linear.app/strapi/issue/EE-274).
 * `clock-countdown` already ships as `ClockCountdownIcon` in `@strapi/icons/regular`.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

const CalendarBlank = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
  </svg>
);

const PaperPlaneTilt = (props: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor" {...props}>
    <path d="M227.32,28.68a16,16,0,0,0-15.66-4.08l-.15,0L19.57,82.84a16,16,0,0,0-2.49,29.8L102,154l41.3,84.87A15.86,15.86,0,0,0,157.74,248q.69,0,1.38-.06a15.88,15.88,0,0,0,14-11.51l58.2-191.94c0-.05,0-.1,0-.15A16,16,0,0,0,227.32,28.68ZM157.83,231.85l-.05.14,0-.07-40.06-82.3,48-48a8,8,0,0,0-11.31-11.31l-48,48L24.08,98.25l-.07,0,.14,0L216,40Z" />
  </svg>
);

export { CalendarBlank, PaperPlaneTilt };
