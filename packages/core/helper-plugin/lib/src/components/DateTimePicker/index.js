import React, { useEffect } from 'react';
import { DateTimePicker } from '@strapi/design-system';

// TODO: remove DateTimePicker component from the helper-plugin in V5
export default function DateTimePickerLegacy(props) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `
        Deprecation warning: Usage of "DateTimePicker" component from the helper-plugin is deprecated and will be removed in the next major release. Instead, use the DateTimePicker from the Design System: import { DateTimePicker } from '@strapi/design-system';"
        `
      );
    }
  }, []);

  return <DateTimePicker {...props} />;
}
