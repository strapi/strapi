import _ from 'lodash';

export type Env = typeof envFn & typeof utils;

function envFn(key: string): string | undefined;
function envFn(key: string, defaultValue: string): string;
function envFn(key: string, defaultValue?: string): string | undefined {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

function getKey(key: string) {
  return process.env[key] ?? '';
}

function int(key: string): number | undefined;
function int(key: string, defaultValue: number): number;
function int(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseInt(getKey(key), 10);
}

function float(key: string): number | undefined;
function float(key: string, defaultValue: number): number;
function float(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseFloat(getKey(key));
}

function bool(key: string): boolean | undefined;
function bool(key: string, defaultValue: boolean): boolean;
function bool(key: string, defaultValue?: boolean): boolean | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return getKey(key) === 'true';
}

function json(key: string, defaultValue?: object): any {
  if (!_.has(process.env, key)) {
    return defaultValue;
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

function array(key: string): string[] | undefined;
function array(key: string, defaultValue: string[]): string[];
function array(key: string, defaultValue?: string[]): string[] | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  let value = getKey(key);

  if (value.startsWith('[') && value.endsWith(']')) {
    value = value.substring(1, value.length - 1);
  }

  return value.split(',').map((v) => {
    return _.trim(_.trim(v, ' '), '"');
  });
}

function date(key: string): Date | undefined;
function date(key: string, defaultValue: Date): Date;
function date(key: string, defaultValue?: Date): Date | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return new Date(getKey(key));
}

/** Gets a value from env that matches oneOf provided values */
function oneOf<T extends string>(key: string, expectedValues: T[]): T | undefined;
function oneOf<T extends string>(key: string, expectedValues: T[], defaultValue: T): T;
function oneOf(key: string, expectedValues: string[], defaultValue?: string) {
  if (!expectedValues) {
    throw new Error(`env.oneOf requires expectedValues`);
  }

  if (defaultValue && !expectedValues.includes(defaultValue)) {
    throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
  }

  const rawValue = env(key, defaultValue);
  return expectedValues.includes(rawValue) ? rawValue : defaultValue;
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
