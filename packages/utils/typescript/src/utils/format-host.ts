import * as ts from 'typescript';
import { identity } from 'lodash/fp';

export const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: identity,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine,
};
