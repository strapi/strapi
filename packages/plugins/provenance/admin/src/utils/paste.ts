/**
 * Pastes shorter than this are ignored: a name or a number copied from elsewhere is not
 * worth asking about.
 */
export const PASTE_MIN_LENGTH = 40;

// Long enough to identify the paste, short enough to stay inside one text node of a Blocks value
const FRAGMENT_LENGTH = 40;

const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

/**
 * Every string inside a field value, joined. Covers plain strings, Markdown and the nested
 * nodes of a Blocks value.
 */
export const collectText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(collectText).join(' ');
  }

  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(collectText)
      .join(' ');
  }

  return '';
};

/**
 * The fields a paste landed in: their value changed, and now contains the start of the
 * pasted text.
 */
export const findPastedFields = ({
  fields,
  before,
  after,
  pasted,
}: {
  fields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  pasted: string;
}) => {
  const fragment = normalize(pasted).slice(0, FRAGMENT_LENGTH);

  if (fragment.length === 0) {
    return [];
  }

  return fields.filter((field) => {
    const previous = normalize(collectText(before[field]));
    const current = normalize(collectText(after[field]));

    return current !== previous && current.includes(fragment);
  });
};

/**
 * Whether a field value still contains the start of a pasted text, for instance after an undo.
 */
export const containsPaste = (value: unknown, pasted: string) => {
  const fragment = normalize(pasted).slice(0, FRAGMENT_LENGTH);

  return fragment.length > 0 && normalize(collectText(value)).includes(fragment);
};
