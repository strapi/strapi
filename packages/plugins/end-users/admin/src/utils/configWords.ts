import { getTranslation } from './getTranslation';

import type { MessageDescriptor } from 'react-intl';

type Format = (descriptor: MessageDescriptor, values?: Record<string, number>) => string;

const UNITS: Record<string, MessageDescriptor> = {
  s: {
    id: getTranslation('duration.seconds'),
    defaultMessage: '{count, plural, one {# second} other {# seconds}}',
  },
  m: {
    id: getTranslation('duration.minutes'),
    defaultMessage: '{count, plural, one {# minute} other {# minutes}}',
  },
  h: {
    id: getTranslation('duration.hours'),
    defaultMessage: '{count, plural, one {# hour} other {# hours}}',
  },
  d: {
    id: getTranslation('duration.days'),
    defaultMessage: '{count, plural, one {# day} other {# days}}',
  },
  w: {
    id: getTranslation('duration.weeks'),
    defaultMessage: '{count, plural, one {# week} other {# weeks}}',
  },
};

/** `7d` is "7 days": the config writes a duration in short form, a person reads it in words */
export const formatDuration = (value: string, format: Format): string => {
  const match = /^(\d+)\s*([smhdw])$/.exec(value.trim());

  return match ? format(UNITS[match[2]], { count: Number(match[1]) }) : value;
};

const STORAGE: Record<string, MessageDescriptor> = {
  database: { id: getTranslation('config.storage.database'), defaultMessage: 'Database' },
  memory: { id: getTranslation('config.storage.memory'), defaultMessage: 'In memory' },
};

/** Where the rate limit keeps its counts */
export const formatStorage = (value: string, format: Format): string =>
  STORAGE[value] ? format(STORAGE[value]) : value;

const DUPLICATES: Record<string, MessageDescriptor> = {
  'keep-oldest': {
    id: getTranslation('config.duplicates.keep-oldest'),
    defaultMessage: 'Keep the oldest',
  },
  abort: { id: getTranslation('config.duplicates.abort'), defaultMessage: 'Stop the migration' },
};

/** What the migration does when two users share an email */
export const formatDuplicates = (value: string, format: Format): string =>
  DUPLICATES[value] ? format(DUPLICATES[value]) : value;
