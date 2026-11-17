import { getTranslation } from './getTranslation';

import type { MessageDescriptor } from 'react-intl';

interface ParamWords {
  label: string;
  hint?: string;
}

type Format = (descriptor: MessageDescriptor) => string;

/** The built-in conditions' inputs, in words: what a role editor and the condition's page call them */
const KNOWN: Record<string, { label: MessageDescriptor; hint: MessageDescriptor }> = {
  setOnCreate: {
    label: {
      id: getTranslation('conditions.param.set-on-create'),
      defaultMessage: 'Set the owner on create',
    },
    hint: {
      id: getTranslation('conditions.param.set-on-create.hint'),
      defaultMessage: 'Set the owner to the signed-in user when an entry is created.',
    },
  },
};

const humanize = (name: string) => {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .trim()
    .toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** An input of a condition by its name: its label, and a hint where the plugin knows what it does */
export const describeParam = (name: string, format: Format): ParamWords => {
  const known = KNOWN[name];

  return known
    ? { label: format(known.label), hint: format(known.hint) }
    : { label: humanize(name) };
};
