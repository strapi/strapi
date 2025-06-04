import _ from 'lodash';

export type Env = typeof envFn & typeof utils;

function envFn(key: string, defaultValue: string): string;
function envFn(key: string, defaultValue?: string | null | undefined): string | undefined;
function envFn(key: string, defaultValue?: string | null | undefined): string | undefined {
  return _.has(process.env, key) ? process.env[key] : (defaultValue ?? undefined);
}

function getKey(key: string) {
  return process.env[key] ?? '';
}

function int(key: string, defaultValue: number): number;
function int(key: string, defaultValue?: number | null | undefined): number | undefined;
function int(key: string, defaultValue?: number | null | undefined): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue ?? undefined;
  }

  const maybeInt = parseInt(getKey(key), 10);

  return Number.isFinite(maybeInt) ? maybeInt : undefined;
}

function float(key: string, defaultValue: number): number;
function float(key: string, defaultValue?: number | null | undefined): number | undefined;
function float(key: string, defaultValue?: number | null | undefined): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue ?? undefined;
  }

  const maybeFloat = parseFloat(getKey(key));

  return Number.isFinite(maybeFloat) ? maybeFloat : undefined;
}

function bool(key: string, defaultValue: boolean): boolean;
function bool(key: string, defaultValue?: boolean | null | undefined): boolean | undefined;
function bool(key: string, defaultValue?: boolean | null | undefined): boolean | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue ?? undefined;
  }

  return getKey(key) === 'true';
}

function json<T extends object>(key: string, defaultValue: T): T;
function json<T extends object>(key: string, defaultValue?: T | null | undefined): T | undefined;
function json(key: string, defaultValue?: object | null | undefined): object | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue ?? undefined;
  }

  try {
    return JSON.parse(getKey(key));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid json environment variable ${key}: ${error.message}`);
    }

    throw error;
  }
}

function array(key: string, defaultValue: string[]): string[];
function array(key: string, defaultValue?: string[] | null | undefined): string[] | undefined;
function array(key: string, defaultValue?: string[] | null | undefined): string[] | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue ?? undefined;
  }

  let value = getKey(key);

  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.substring(1, value.length - 1);
  }

  return value.split(',').map((v) => {
    return _.trim(_.trim(v, ' '), '"');
  });
}

function date(key: string, defaultValue: Date): Date;
function date(key: string, defaultValue?: Date | null | undefined): Date | undefined;
function date(key: string, defaultValue?: Date | null | undefined): Date | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue ?? undefined;
  }

  const maybeDate = new Date(getKey(key));

  return Number.isFinite(maybeDate.getTime()) ? maybeDate : undefined;
}

/** Gets a value from env that matches oneOf provided values */
function oneOf<T extends string>(key: string, expectedValues: T[], defaultValue: T): T;
function oneOf<T extends string>(
  key: string,
  expectedValues: T[],
  defaultValue?: T | null | undefined
): T | undefined;
function oneOf(
  key: string,
  expectedValues: string[],
  defaultValue?: string | null | undefined
): string | undefined {
  if (!expectedValues) {
    throw new Error(`env.oneOf requires expectedValues`);
  }

  if (defaultValue != null && !expectedValues.includes(defaultValue)) {
    throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
  }

  const rawValue = env(key, defaultValue);

  return rawValue != null && expectedValues.includes(rawValue)
    ? rawValue
    : (defaultValue ?? undefined);
}

const utils = {
  int,
  float,
  bool,
  json,
  array,
  date,
  oneOf,
};

const env: Env = Object.assign(envFn, utils);

export default env;
