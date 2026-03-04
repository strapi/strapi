import _ from 'lodash';

export type Env = typeof envFn & typeof utils;

function envFn(key: string): string | undefined;
function envFn(key: string, defaultValue: string): string;
function envFn<T>(key: string, defaultValue: T): string | T;
function envFn(key: string, defaultValue?: any): any {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

function getKey(key: string) {
  return process.env[key] ?? '';
}

function int(key: string, defaultValue: number): number;
function int(key: string, defaultValue?: number | undefined): number | undefined;
function int(key: string, defaultValue?: number | undefined): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseInt(getKey(key), 10);
}

function float(key: string, defaultValue: number): number;
function float(key: string, defaultValue?: number | undefined): number | undefined;
function float(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseFloat(getKey(key));
}

function bool(key: string, defaultValue: boolean): boolean;
function bool(key: string, defaultValue?: boolean | undefined): boolean | undefined;
function bool(key: string, defaultValue?: boolean): boolean | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return getKey(key) === 'true';
}

function json<T extends object>(key: string, defaultValue: T): T;
function json<T extends object>(key: string, defaultValue?: T | undefined): T | undefined;
function json(key: string, defaultValue?: object) {
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

function array(key: string, defaultValue: string[]): string[];
function array(key: string, defaultValue?: string[] | undefined): string[] | undefined;
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

function date(key: string, defaultValue: Date): Date;
function date(key: string, defaultValue?: Date | undefined): Date | undefined;
function date(key: string, defaultValue?: Date): Date | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return new Date(getKey(key));
}

/**
 * Gets a value from env that matches oneOf provided values
 * @param {string} key
 * @param {string[]} expectedValues
 * @param {string|undefined} defaultValue
 * @returns {string|undefined}
 */
function oneOf<T extends string, TDefault extends T = T>(
  key: string,
  expectedValues: T[],
  defaultValue: TDefault
): T;
function oneOf<T extends string, TDefault extends T = T>(
  key: string,
  expectedValues: T[],
  defaultValue?: TDefault | undefined
): T | undefined;
function oneOf(key: string, expectedValues?: string[], defaultValue?: string) {
  if (!expectedValues) {
    throw new Error(`env.oneOf requires expectedValues`);
  }

  if (defaultValue && !expectedValues.includes(defaultValue)) {
    throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
  }

  const rawValue = env(key, defaultValue);
  if (rawValue !== undefined && expectedValues.includes(rawValue)) {
    return rawValue;
  }

  return defaultValue;
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
