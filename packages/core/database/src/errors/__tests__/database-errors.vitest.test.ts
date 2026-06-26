import { describe, it, expect } from 'vitest';

import DatabaseError from '../database';
import InvalidDateError from '../invalid-date';
import InvalidDateTimeError from '../invalid-datetime';
import InvalidTimeError from '../invalid-time';
import InvalidRelationError from '../invalid-relation';
import NotNullError from '../not-null';

describe('database errors', () => {
  it('DatabaseError sets name, message, and details', () => {
    const error = new DatabaseError('Something failed', { code: 'X' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Something failed');
    expect(error.details).toEqual({ code: 'X' });
  });

  it('InvalidDateError uses default message and name', () => {
    const error = new InvalidDateError();

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.name).toBe('InvalidDateFormat');
    expect(error.message).toBe('Invalid date format, expected YYYY-MM-DD');
  });

  it('InvalidDateTimeError uses custom message', () => {
    const error = new InvalidDateTimeError('Bad datetime');

    expect(error.name).toBe('InvalidDatetimeFormat');
    expect(error.message).toBe('Bad datetime');
  });

  it('InvalidTimeError uses default message', () => {
    const error = new InvalidTimeError();

    expect(error.name).toBe('InvalidTimeFormat');
    expect(error.message).toBe('Invalid time format, expected HH:mm:ss.SSS');
  });

  it('InvalidRelationError uses default message', () => {
    const error = new InvalidRelationError();

    expect(error.name).toBe('InvalidRelationFormat');
    expect(error.message).toBe('Invalid relation format');
  });

  it('NotNullError includes column in message and details', () => {
    const error = new NotNullError({ column: 'title' });

    expect(error.name).toBe('NotNullError');
    expect(error.message).toBe('Not null constraint violation on column title.');
    expect(error.details).toEqual({ column: 'title' });
    expect(error.stack).toBe('');
  });

  it('NotNullError omits column when not provided', () => {
    const error = new NotNullError();

    expect(error.message).toBe('Not null constraint violation.');
    expect(error.details).toEqual({ column: '' });
  });
});
