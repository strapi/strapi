/**
 * Pairs each item with a key made of what it says, for a list that has no id of its own. An item
 * that appears twice gets a count after its text, so the key is unique and stays with the item when
 * the others around it change.
 */
export const withOccurrenceKeys = <T>(
  items: T[],
  textOf: (item: T) => string
): Array<[string, T]> => {
  const seen = new Map<string, number>();

  return items.map((item) => {
    const text = textOf(item);
    const count = (seen.get(text) ?? 0) + 1;

    seen.set(text, count);

    return [count === 1 ? text : `${text}#${count}`, item];
  });
};
