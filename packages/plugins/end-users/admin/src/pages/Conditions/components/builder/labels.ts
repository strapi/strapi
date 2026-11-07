import { useIntl } from 'react-intl';

const WORDS = {
  field: 'field',
  operator: 'operator',
  value: 'value',
  match: 'match',
  kind: 'kind',
  source: 'source',
  attribute: 'attribute',
  roles: 'roles',
  email: 'email',
  name: 'name',
  default: 'default',
  required: 'required',
  input: 'input',
  offset: 'offset',
  fieldKind: 'field kind',
  relationTarget: 'relation target',
  valueKind: 'value kind',
  userAttribute: 'user attribute',
  profileAttribute: 'profile attribute',
  offsetUnit: 'offset unit',
} as const;

export type Word = keyof typeof WORDS;

/**
 * The accessible names of the builder's controls: a row's name ("Which check 1") and what each
 * control of it is ("Which check 1 field"). Every word is a message with its English default.
 */
export const useLabels = () => {
  const { formatMessage } = useIntl();
  const id = (key: string) => `end-users.conditions.builder.label.${key}`;

  return {
    /** "Which": the root group's name */
    which: formatMessage({ id: id('which'), defaultMessage: 'Which' }),
    /** `label` and the word for one of its controls */
    suffix: (label: string, word: Word) =>
      `${label} ${formatMessage({ id: id(word), defaultMessage: WORDS[word] })}`,
    check: (label: string, n: number) =>
      `${label} ${formatMessage({ id: id('check'), defaultMessage: 'check {n}' }, { n })}`,
    group: (label: string, n: number) =>
      `${label} ${formatMessage({ id: id('group'), defaultMessage: 'group {n}' }, { n })}`,
    inputRow: (n: number) =>
      formatMessage({ id: id('input-row'), defaultMessage: 'Input {n}' }, { n }),
    whoRow: (n: number) =>
      formatMessage({ id: id('who-row'), defaultMessage: 'Who check {n}' }, { n }),
    stampRow: (n: number) =>
      formatMessage({ id: id('stamp-row'), defaultMessage: 'Stamp {n}' }, { n }),
    true: formatMessage({ id: id('true'), defaultMessage: 'true' }),
    false: formatMessage({ id: id('false'), defaultMessage: 'false' }),
    unit: (unit: 'minutes' | 'hours' | 'days') =>
      formatMessage({ id: id(unit), defaultMessage: unit }),
  };
};
