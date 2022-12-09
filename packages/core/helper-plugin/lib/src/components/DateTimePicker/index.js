import React, { useEffect } from 'react';
import { DateTimePicker as MyDateTimePicker } from '@strapi/design-system';

export default function DateTimePicker(props) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `
        TODO V5: remove DateTimePicker component from the helper-plugin
        Deprecation warning: Usage of "DateTimePicker" component from the helper-plugin is deprecated and will be removed in the next major release. Instead, use the DateTimePicker from the Design System: import { DateTimePicker } from '@strapi/design-system';"
        `
      );
    }
  }, []);

  return <MyDateTimePicker {...props} />;
}
