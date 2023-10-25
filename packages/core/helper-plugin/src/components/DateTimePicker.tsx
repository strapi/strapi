import * as React from 'react';

import { DateTimePicker, DateTimePickerProps } from '@strapi/design-system';

import { once } from '../utils/once';

const warnOnce = once(console.warn);

// TODO: remove DateTimePicker component from the helper-plugin in V5
/**
 * @deprecated Use the DateTimePicker from the Design System instead.
 */
const DateTimePickerLegacy = (props: DateTimePickerProps) => {
  warnOnce(
    `
      Deprecation warning: Usage of "DateTimePicker" component from the helper-plugin is deprecated and will be removed in the next major release. Instead, use the DateTimePicker from the Design System: import { DateTimePicker } from '@strapi/design-system';"
    `
  );

  return <DateTimePicker {...props} />;
};

export { DateTimePickerLegacy as DateTimePicker };
