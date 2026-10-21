import fse from 'fs-extra';
import { isEqual, isPlainObject } from 'lodash';
import { applyEdits, modify, parse, printParseErrorCode } from 'jsonc-parser';

import type { FormattingOptions, JSONPath, ParseError } from 'jsonc-parser';
import type { Utils } from '@strapi/types';

const FORMATTING_OPTIONS: FormattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' };

/**
 * Parses JSON text. Accepts JSONC (comments and trailing commas), as used by tsconfig files.
 */
const parseJSON = (text: string): Utils.JSONValue => {
  const errors: ParseError[] = [];
  const json = parse(text, errors, { allowTrailingComma: true });

  if (errors.length > 0) {
    const [{ error, offset }] = errors;

    throw new SyntaxError(`Invalid JSON: ${printParseErrorCode(error)} at offset ${offset}`);
  }

  return json;
};

const isJSONObject = (value: unknown): value is Utils.JSONObject => isPlainObject(value);

/**
 * Applies the difference between `current` and `next` to `text` as minimal edits, so the
 * comments and formatting of the untouched parts stay as they are.
 */
const applyJSONDiff = (
  text: string,
  jsonPath: JSONPath,
  current: Utils.JSONValue | undefined,
  next: Utils.JSONValue
): string => {
  if (isJSONObject(current) === false || isJSONObject(next) === false) {
    return applyEdits(
      text,
      modify(text, jsonPath, next, { formattingOptions: FORMATTING_OPTIONS })
    );
  }

  let result = text;

  for (const key of Object.keys(current)) {
    if (key in next === false) {
      result = applyEdits(
        result,
        modify(result, [...jsonPath, key], undefined, { formattingOptions: FORMATTING_OPTIONS })
      );
    }
  }

  for (const [key, value] of Object.entries(next)) {
    if (isEqual(current[key], value) === false) {
      result = applyJSONDiff(result, [...jsonPath, key], current[key], value);
    }
  }

  return result;
};

export const readJSON = async (path: string): Promise<Utils.JSONValue> => {
  const buffer = await fse.readFile(path);

  return parseJSON(buffer.toString());
};

export const saveJSON = async (path: string, json: Utils.JSONValue): Promise<void> => {
  const fileExists = await fse.pathExists(path);

  if (fileExists === false) {
    await fse.writeFile(path, `${JSON.stringify(json, null, 2)}\n`);
    return;
  }

  const text = (await fse.readFile(path)).toString();
  const updated = applyJSONDiff(text, [], parseJSON(text), json);

  await fse.writeFile(path, updated);
};
