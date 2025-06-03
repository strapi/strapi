export const CODEMOD_CODE_SUFFIX = 'code';

export const CODEMOD_JSON_SUFFIX = 'json';

export const CODEMOD_ALLOWED_SUFFIXES = [CODEMOD_CODE_SUFFIX, CODEMOD_JSON_SUFFIX];

export const CODEMOD_EXTENSION = 'ts';

export const CODEMOD_FILE_REGEXP = new RegExp(
  `^.+[.](${CODEMOD_ALLOWED_SUFFIXES.join('|')})[.]${CODEMOD_EXTENSION}$`
);
