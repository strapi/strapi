import type { Subject, SubjectProperty } from '../../../../../../../shared/contracts/permissions';

/**
 * The search of the permissions editor (`PermissionsProps.searchable`) only decides what is
 * listed: it never reads or changes the form. A search is the text as typed, trimmed and lower
 * case (see `normalizeSearch`); an empty one lists everything.
 */

const normalizeSearch = (query: string) => query.trim().toLowerCase();

const matchesSearch = (text: string, search: string) => text.toLowerCase().includes(search);

/**
 * Whether a field or group matches: its label does, or the label of a field under it.
 */
const fieldMatchesSearch = (field: SubjectProperty, search: string): boolean =>
  matchesSearch(field.label, search) ||
  (field.children ?? []).some((child) => fieldMatchesSearch(child, search));

/**
 * Whether a row inside a content type matches: a field (of any property) or a locked row. A
 * content type that only matches by its own label has none, which is what keeps it closed when a
 * search opens the first content type that has a match (see `ContentTypeCollapses`).
 */
const subjectHasMatchingRow = (subject: Subject, search: string): boolean =>
  subject.properties.some((property) =>
    (property.children ?? []).some((field) => fieldMatchesSearch(field, search))
  ) || (subject.locked ?? []).some(({ label }) => matchesSearch(label, search));

/**
 * Whether a content type matches: its label does, or a row inside it does.
 */
const subjectMatchesSearch = (subject: Subject, search: string): boolean =>
  matchesSearch(subject.label, search) || subjectHasMatchingRow(subject, search);

/**
 * What is left to search for below an item whose own label did not match: the search itself, so
 * only what matches is listed. `undefined` once the item's label matches, which lists everything
 * under it.
 */
const getSearchBelow = (label: string, search: string | undefined) =>
  search !== undefined && !matchesSearch(label, search) ? search : undefined;

export {
  fieldMatchesSearch,
  getSearchBelow,
  matchesSearch,
  normalizeSearch,
  subjectHasMatchingRow,
  subjectMatchesSearch,
};
