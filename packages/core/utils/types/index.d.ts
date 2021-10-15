export * from '../lib';

import yup from 'yup';
import yupTypes from 'yup/lib/types';

declare module 'yup' {
  interface StringSchema {
    isCamelCase(message?: string): StringSchema;
    isKebabCase(message?: string): StringSchema;
  }
  interface ObjectSchema {
    onlyContainsFunctions(message?: string): ObjectSchema;
  }
}
