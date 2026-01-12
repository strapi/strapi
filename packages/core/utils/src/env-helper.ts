import _ from 'lodash';

export type Env = typeof envFn & typeof utils;

function envFn<T>(key: string): string | T | undefined;
function envFn<T>(key: string, defaultValue: T): string | T;
function envFn<T>(key: string, defaultValue?: T): string | T | undefined {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

function getKey(key: string) {
  return process.env[key] ?? '';
}


function intFromEnv(key: string): number | undefined;
function intFromEnv(key: string, defaultValue: number): number;
function intFromEnv(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseInt(getKey(key), 10);
}

function floatFromEnv(key: string): number | undefined;
function floatFromEnv(key: string, defaultValue: number): number;
function floatFromEnv(key: string, defaultValue?: number): number | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return parseFloat(getKey(key));
}

function boolFromEnv(key: string): boolean | undefined;
function boolFromEnv(key: string, defaultValue: boolean): boolean;
function boolFromEnv(key: string, defaultValue?: boolean): boolean | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return getKey(key) === 'true';
}

type JSON = string | number | boolean | null | object | any[];

function jsonFromEnv(key: string): JSON | undefined;
function jsonFromEnv(key: string, defaultValue: JSON): JSON;
function jsonFromEnv(key: string, defaultValue?: JSON) {
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

function arrayFromEnv(key: string): string[] | undefined;
function arrayFromEnv(key: string, defaultValue: string[]): string[];
function arrayFromEnv(key: string, defaultValue?: string[]): string[] | undefined {
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

function oneOfFromEnv(key: string, expectedValues: unknown[]): unknown | undefined;
function oneOfFromEnv(key: string, expectedValues: number[], defaultValue: number): number;
function oneOfFromEnv(key: string, expectedValues: string[], defaultValue: string): string;
function oneOfFromEnv(key: string, expectedValues: unknown[], defaultValue: unknown): unknown;
function oneOfFromEnv(key: string, expectedValues: unknown[], defaultValue?: unknown): unknown | undefined {
  if (!expectedValues) {
    throw new Error(`env.oneOf requires expectedValues`);
  }

  if (defaultValue && !expectedValues.includes(defaultValue)) {
    throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
  }

  const rawValue = env(key, defaultValue);
  return expectedValues.includes(rawValue) ? rawValue : defaultValue;
}

function dateFromEnv(key: string): Date | undefined;
function dateFromEnv(key: string, defaultValue: Date): Date;
function dateFromEnv(key: string, defaultValue?: Date): Date | undefined {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }

  return new Date(getKey(key));
}

const utils = {
  int: intFromEnv,

  float: floatFromEnv,

  bool: boolFromEnv,

  json: jsonFromEnv,

  array: arrayFromEnv,

  date: dateFromEnv,

  oneOf: oneOfFromEnv,
};

const env: Env = Object.assign(envFn, utils);

export default env;
