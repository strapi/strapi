import _ from 'lodash';

function env<T>(key: string, defaultValue?: T): string | T | undefined {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}

function getKey(key: string) {
  return process.env[key] ?? '';
}

const utils = {
  int(key: string, defaultValue?: number): number {
    if (!_.has(process.env, key) && defaultValue) {
      return defaultValue;
    }

    return parseInt(getKey(key), 10);
  },

  float(key: string, defaultValue?: number): number {
    if (!_.has(process.env, key) && defaultValue) {
      return defaultValue;
    }

    return parseFloat(getKey(key));
  },

  bool(key: string, defaultValue?: boolean): boolean {
    if (!_.has(process.env, key) && defaultValue) {
      return defaultValue;
    }

    return getKey(key) === 'true';
  },

  json(key: string, defaultValue?: object) {
    if (!_.has(process.env, key) && defaultValue) {
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
  },

  array(key: string, defaultValue?: string[]): string[] {
    if (!_.has(process.env, key) && defaultValue) {
      return defaultValue;
    }

    let value = getKey(key);

    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.substring(1, value.length - 1);
    }

    return value.split(',').map((v) => {
      return _.trim(_.trim(v, ' '), '"');
    });
  },

  date(key: string, defaultValue?: Date): Date {
    if (!_.has(process.env, key) && defaultValue) {
      return defaultValue;
    }

    return new Date(getKey(key));
  },

  /**
   * Gets a value from env that matches oneOf provided values
   * @param {string} key
   * @param {string[]} expectedValues
   * @param {string|undefined} defaultValue
   * @returns {string|undefined}
   */
  oneOf(key: string, expectedValues?: unknown[], defaultValue?: unknown) {
    if (!expectedValues) {
      throw new Error(`env.oneOf requires expectedValues`);
    }

    if (defaultValue && !expectedValues.includes(defaultValue)) {
      throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
    }

    const rawValue = env(key, defaultValue);
    return expectedValues.includes(rawValue) ? rawValue : defaultValue;
  },
};

Object.assign(env, utils);

export = env;
