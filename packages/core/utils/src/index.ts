/* eslint-disable @typescript-eslint/no-namespace */
/**
 * Export shared utilities
 */
import type * as yupTypes from 'yup';
import parseMultipartData from './parse-multipart';
import parseType from './parse-type';
import * as policy from './policy';
import templateConfiguration from './template-configuration';
import { handleYupError, validateYupSchema, validateYupSchemaSync } from './validators';
import * as yup from './yup';

import * as errors from './errors';
import {
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  escapeQuery,
  stringIncludes,
  stringEquals,
  isKebabCase,
  isCamelCase,
  toRegressedEnumValue,
  startsWithANumber,
  joinBy,
  toKebabCase,
} from './string-formatting';
import { removeUndefined, keysDeep } from './object-formatting';
import { getConfigUrls, getAbsoluteAdminUrl, getAbsoluteServerUrl } from './config';
import { generateTimestampCode } from './code-generator';
import * as contentTypes from './content-types';
import env from './env-helper';
import * as relations from './relations';
import setCreatorFields from './set-creator-fields';
import * as hooks from './hooks';
import providerFactory from './provider-factory';
import * as pagination from './pagination';
import sanitize from './sanitize';
import validate from './validate';
import traverseEntity from './traverse-entity';
import { pipeAsync, mapAsync, reduceAsync, forEachAsync } from './async';
import convertQueryParams from './convert-query-params';
import importDefault from './import-default';
import * as template from './template';
import * as file from './file';
import * as traverse from './traverse';
import webhook from './webhook';
import { isOperator, isOperatorOfType } from './operators';

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace utils {
  export namespace yup {
    export type BaseSchema = yupTypes.BaseSchema;
    export type AnySchema = yupTypes.AnySchema;
    export type NumberSchema = yupTypes.NumberSchema;
    export type StringSchema = yupTypes.StringSchema;
    export type BooleanSchema = yupTypes.BooleanSchema;
    export type ObjectSchema = yupTypes.AnyObjectSchema;
    export type ArraySchema<T extends yupTypes.AnySchema = any> = yupTypes.ArraySchema<T>;
    export type LazySchema<T extends yupTypes.AnySchema = any> = ReturnType<
      typeof yupTypes.lazy<T>
    >;
  }
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
const utils = {
  parseMultipartData,
  parseType,
  policy,
  templateConfiguration,
  yup,
  handleYupError,
  validateYupSchema,
  validateYupSchemaSync,
  errors,
  nameToSlug,
  nameToCollectionName,
  getCommonBeginning,
  escapeQuery,
  stringIncludes,
  stringEquals,
  isKebabCase,
  isCamelCase,
  toRegressedEnumValue,
  startsWithANumber,
  joinBy,
  toKebabCase,
  removeUndefined,
  keysDeep,
  getConfigUrls,
  getAbsoluteAdminUrl,
  getAbsoluteServerUrl,
  generateTimestampCode,
  contentTypes,
  env,
  relations,
  setCreatorFields,
  hooks,
  providerFactory,
  pagination,
  sanitize,
  validate,
  traverseEntity,
  pipeAsync,
  mapAsync,
  reduceAsync,
  forEachAsync,
  convertQueryParams,
  importDefault,
  template,
  file,
  traverse,
  webhook,
  isOperator,
  isOperatorOfType,
};

export = utils;
