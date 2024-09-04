import { Schema } from '@strapi/types';

export const parseDateValue = <TAttribute extends Schema.Attribute.AnyAttribute>(
  value: Schema.Attribute.Value<TAttribute>
) => {
  if (value instanceof Date && isValidDate(value)) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (isValidDate(date)) {
      return date;
    }
  }
};

const isValidDate = (date: Date): boolean => !isNaN(date.getTime());
