export const parseDateValue = (value: unknown): Date | undefined => {
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
