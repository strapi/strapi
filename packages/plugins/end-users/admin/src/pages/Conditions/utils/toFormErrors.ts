/** The parts of the page a refusal can name */
type FormPart = 'slug' | 'displayName' | 'subjects' | 'filters';

interface FormErrors {
  /** What each part says, by the part the server named */
  parts: Partial<Record<FormPart, string>>;
  /** What the server said that names no part of the page */
  others: string[];
}

/** The first step of the path the server names, and the part of the page it is: Where is `query` */
const PARTS = new Map<string, FormPart>([
  ['slug', 'slug'],
  ['displayName', 'displayName'],
  ['subjects', 'subjects'],
  ['query', 'filters'],
]);

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * A refusal of the conditions routes is a `ValidationError` whose `details.errors` each name where
 * in the condition the problem is (`['slug']`, `['query', '$and', 0, 'title']`). Sorts them by the
 * part of the page that shows them, so that each is read where it can be fixed.
 */
const toFormErrors = (error: unknown): FormErrors => {
  const details = isPlain(error) && isPlain(error.details) ? error.details : undefined;
  const list: unknown[] = Array.isArray(details?.errors) ? details.errors : [];

  const found = new Map<FormPart, string[]>();
  const others: string[] = [];

  for (const item of list) {
    if (isPlain(item) && typeof item.message === 'string') {
      const [first] = Array.isArray(item.path) ? item.path : [];
      const part = typeof first === 'string' ? PARTS.get(first) : undefined;

      if (part) {
        found.set(part, [...(found.get(part) ?? []), item.message]);
      } else {
        others.push(item.message);
      }
    }
  }

  return {
    parts: Object.fromEntries([...found].map(([part, messages]) => [part, messages.join('; ')])),
    others,
  };
};

export { toFormErrors };
export type { FormErrors, FormPart };
