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

export const removeFile = (selection: PickerSelection, id: number): PickerSelection =>
  selection.filter((file) => file.id !== id);

/** Same files in the same order: confirming would change nothing. */
export const isSameSelection = (a: PickerSelection, b: PickerSelection) =>
  a.length === b.length && a.every((file, index) => file.id === b[index].id);
