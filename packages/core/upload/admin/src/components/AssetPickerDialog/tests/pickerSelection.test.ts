import { addFiles, isSameSelection, moveFile, removeFile, toggleFile } from '../pickerSelection';

import type { File } from '../../../../../shared/contracts/files';

const file = (id: number): File => ({
  id,
  name: `file-${id}.png`,
  hash: `h${id}`,
  mime: 'image/png',
});

const ids = (files: File[]) => files.map(({ id }) => id);

describe('pickerSelection', () => {
  describe('toggleFile', () => {
    it('appends a new pick after the existing ones on a multiple field', () => {
      expect(ids(toggleFile([file(1), file(2)], file(3), { multiple: true }))).toEqual([1, 2, 3]);
    });

    it('removes a file that is already selected', () => {
      expect(ids(toggleFile([file(1), file(2), file(3)], file(2), { multiple: true }))).toEqual([
        1, 3,
      ]);
    });

    it('puts a re-checked file back at the end', () => {
      const unchecked = toggleFile([file(1), file(2)], file(1), { multiple: true });

      expect(ids(toggleFile(unchecked, file(1), { multiple: true }))).toEqual([2, 1]);
    });

    it('replaces the selection on a single field', () => {
      expect(ids(toggleFile([file(1)], file(2), { multiple: false }))).toEqual([2]);
    });

    it('clears a single field when its file is clicked again', () => {
      expect(toggleFile([file(1)], file(1), { multiple: false })).toEqual([]);
    });
  });

  it('addFiles appends only files not already selected, in their order', () => {
    expect(ids(addFiles([file(1), file(2)], [file(2), file(3), file(4)]))).toEqual([1, 2, 3, 4]);
  });

  it('removeFile drops one file and keeps the order', () => {
    expect(ids(removeFile([file(1), file(2), file(3)], 2))).toEqual([1, 3]);
  });

  describe('moveFile', () => {
    it('moves a file forward, shifting the ones in between back', () => {
      expect(ids(moveFile([file(1), file(2), file(3), file(4)], 1, 3))).toEqual([2, 3, 1, 4]);
    });

    it('moves a file backward, shifting the ones in between forward', () => {
      expect(ids(moveFile([file(1), file(2), file(3), file(4)], 4, 2))).toEqual([1, 4, 2, 3]);
    });

    it('leaves the selection as is for an unknown id or a drop in place', () => {
      const selection = [file(1), file(2)];

      expect(moveFile(selection, 1, 9)).toBe(selection);
      expect(moveFile(selection, 2, 2)).toBe(selection);
    });
  });

  describe('isSameSelection', () => {
    it('is true for the same files in the same order', () => {
      expect(isSameSelection([file(1), file(2)], [file(1), file(2)])).toBe(true);
    });

    it('is false when the order differs', () => {
      expect(isSameSelection([file(1), file(2)], [file(2), file(1)])).toBe(false);
    });

    it('is false when a file was added or removed', () => {
      expect(isSameSelection([file(1)], [file(1), file(2)])).toBe(false);
    });
  });
});
