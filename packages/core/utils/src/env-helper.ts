import _ from 'lodash';

export type Env = typeof envFn & typeof utils;

function envFn(key: string): string | undefined;
function envFn<T>(key: string, defaultValue: T): string | T;
function envFn(key: string, defaultValue: undefined): string | undefined;
function envFn<T>(key: string, defaultValue?: T): string | T | undefined {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

function getKey(key: string) {
  return process.env[key] ?? '';
}

function envInt(key: string): number | undefined;
function envInt(key: string, defaultValue: number): number;
function envInt(key: string, defaultValue: undefined): number | undefined;
function envInt(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseInt(getKey(key), 10);
}

function envFloat(key: string): number | undefined;
function envFloat(key: string, defaultValue: number): number;
function envFloat(key: string, defaultValue: undefined): number | undefined;
function envFloat(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseFloat(getKey(key));
}

function envBool(key: string): boolean | undefined;
function envBool(key: string, defaultValue: boolean): boolean;
function envBool(key: string, defaultValue: undefined): boolean | undefined;
function envBool(key: string, defaultValue?: boolean): boolean | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return getKey(key) === 'true';
}

function envJson(key: string): object | undefined;
function envJson(key: string, defaultValue: object): object;
function envJson(key: string, defaultValue: undefined): object | undefined;
function envJson(key: string, defaultValue?: object): object | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  try {
    return JSON.parse(getKey(key));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid JSON environment variable ${key}: ${error.message}`);
    }

    throw error;
  }
}

function envArray(key: string): ReadonlyArray<string> | undefined;
function envArray(key: string, defaultValue: ReadonlyArray<string>): ReadonlyArray<string>;
function envArray(key: string, defaultValue: undefined): ReadonlyArray<string> | undefined;
function envArray(
  key: string,
  defaultValue?: ReadonlyArray<string>
): ReadonlyArray<string> | undefined {
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

function envDate(key: string): Date | undefined;
function envDate(key: string, defaultValue: Date): Date;
function envDate(key: string, defaultValue: undefined): Date | undefined;
function envDate(key: string, defaultValue?: Date): Date | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return new Date(getKey(key));
}

/**
 * Gets a value from env that matches oneOf provided values
 */
function envOneOf<T extends string>(key: string, expectedValues: ReadonlyArray<T>): T | undefined;
function envOneOf<T extends string>(
  key: string,
  expectedValues: ReadonlyArray<T>,
  defaultValue: NoInfer<T>
): T;
function envOneOf<T extends string>(
  key: string,
  expectedValues: ReadonlyArray<T>,
  defaultValue: undefined
): T | undefined;
function envOneOf<T extends string>(
  key: string,
  expectedValues?: ReadonlyArray<T>,
  defaultValue?: NoInfer<T>
): T | undefined {
  if (!expectedValues) {
    throw new Error(`env.oneOf requires expectedValues`);
  }

  if (defaultValue && !expectedValues.includes(defaultValue)) {
    throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
  }

  const rawValue = env(key, defaultValue) as T;
  return expectedValues.includes(rawValue) ? rawValue : defaultValue;
}

const utils = {
  int: envInt,
  float: envFloat,
  bool: envBool,
  json: envJson,
  array: envArray,
  date: envDate,
  oneOf: envOneOf,
};

const env: Env = Object.assign(envFn, utils);

export default env;
