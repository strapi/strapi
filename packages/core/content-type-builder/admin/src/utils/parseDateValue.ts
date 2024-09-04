import { Schema } from '@strapi/types';

export const parseDateValue = <TAttribute extends Schema.Attribute.AnyAttribute>(
  value: Schema.Attribute.Value<TAttribute>
): Date | undefined => {
  if (value instanceof Date) {
    return isValidDate(value) ? value : undefined;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : undefined;
  }

  return undefined;
};

const isValidDate = (date: Date): boolean => !isNaN(date.getTime());
