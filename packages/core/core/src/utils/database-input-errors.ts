import { errors as databaseErrors } from '@strapi/database';

/**
 * Database errors raised when a value cannot be converted to the column type
 * (e.g. a filter `filters[flag][$eq]=no` on a boolean). They are caused by the
 * request input, so they are answered with a 400 ValidationError instead of a 500.
 * Every other DatabaseError stays an internal error.
 */
const databaseInputErrors = [
  databaseErrors.InvalidTimeError,
  databaseErrors.InvalidDateTimeError,
  databaseErrors.InvalidDateError,
  databaseErrors.InvalidRelationError,
  databaseErrors.InvalidBooleanError,
];

const isDatabaseInputError = (
  error: unknown
): error is InstanceType<typeof databaseErrors.DatabaseError> => {
  return databaseInputErrors.some((errorClass) => error instanceof errorClass);
};

export { databaseInputErrors, isDatabaseInputError };
