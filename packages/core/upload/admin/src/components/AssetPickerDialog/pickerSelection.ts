import type { File } from '../../../../shared/contracts/files';

/**
 * The picker's selection is the value the field will hold once confirmed:
 * whole `File` objects, in order. Assets already in the field come first, new
 * picks are appended in the order they are clicked.
 */
export type PickerSelection = File[];

export const hasFile = (selection: PickerSelection, id: number) =>
  selection.some((file) => file.id === id);

/**
 * Adds the file, or removes it if it is already there. On a single-value field
 * a new pick replaces whatever was selected.
 */
export const toggleFile = (
  selection: PickerSelection,
  file: File,
  { multiple }: { multiple: boolean }
): PickerSelection => {
  if (hasFile(selection, file.id)) {
    return selection.filter(({ id }) => id !== file.id);
  }

  return multiple ? [...selection, file] : [file];
};

/** Appends every file not already selected, keeping their order (select-all). */
export const addFiles = (selection: PickerSelection, files: File[]): PickerSelection => [
  ...selection,
  ...files.filter((file) => !hasFile(selection, file.id)),
];

export const removeFile = (selection: PickerSelection, id: number): PickerSelection =>
  selection.filter((file) => file.id !== id);

/**
 * Moves one file to where another one is, the others shifting to make room.
 * Unknown ids leave the selection as it is.
 */
export const moveFile = (
  selection: PickerSelection,
  activeId: number,
  overId: number
): PickerSelection => {
  const from = selection.findIndex(({ id }) => id === activeId);
  const to = selection.findIndex(({ id }) => id === overId);

  if (from === -1 || to === -1 || from === to) {
    return selection;
  }

  const next = [...selection];
  const [file] = next.splice(from, 1);
  next.splice(to, 0, file);

  return next;
};

/** Same files in the same order: confirming would change nothing. */
export const isSameSelection = (a: PickerSelection, b: PickerSelection) =>
  a.length === b.length && a.every((file, index) => file.id === b[index].id);
