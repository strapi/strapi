import { stripVTControlCharacters } from 'node:util';

const CONTROL_CHARACTERS = /\p{Cc}/gu;
const FORMAT_CHARACTERS = /\p{Cf}/gu;

export const toPrintableText = (text: unknown): string | undefined => {
  if (typeof text !== 'string') {
    return undefined;
  }

  const printableText = stripVTControlCharacters(text)
    .replace(FORMAT_CHARACTERS, '')
    .replace(CONTROL_CHARACTERS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return printableText || undefined;
};
