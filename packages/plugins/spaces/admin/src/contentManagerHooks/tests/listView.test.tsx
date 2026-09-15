/* eslint-disable check-file/filename-naming-convention */
import { ALL_SPACES } from '../../constants';
import { setSelectedSpace } from '../../selectedSpace';
import { addSpaceColumnHook } from '../listView';

const HEADERS = [{ name: 'title' }, { name: 'createdAt' }] as never[];
const LAYOUT = { settings: {} } as never;

const run = () => addSpaceColumnHook({ displayedHeaders: HEADERS, layout: LAYOUT });

describe('the Space column in the content list', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setSelectedSpace(null);
  });

  describe('in the all-spaces view', () => {
    beforeEach(() => {
      setSelectedSpace(ALL_SPACES);
    });

    it('is added, because it is what the list cannot otherwise say', () => {
      const { displayedHeaders } = run();

      expect(displayedHeaders.map((header) => header.name)).toEqual([
        'title',
        'createdAt',
        'space',
      ]);
    });

    it('goes last, leaving the list as it was', () => {
      const { displayedHeaders } = run();

      expect(displayedHeaders.slice(0, 2)).toEqual(HEADERS);
    });

    it('cannot be sorted or searched by, because it is not a real field', () => {
      const { displayedHeaders } = run();
      const column = displayedHeaders.at(-1)!;

      expect(column).toMatchObject({ sortable: false, searchable: false });
    });

    it('leaves the rest of the layout alone', () => {
      expect(run().layout).toBe(LAYOUT);
    });
  });

  describe('inside a space', () => {
    it('is left out, because every row would say the same thing', () => {
      // And each row would cost a lookup to say it.
      setSelectedSpace('france');

      expect(run().displayedHeaders).toBe(HEADERS);
    });
  });

  describe('with no space chosen', () => {
    it('is left out', () => {
      expect(run().displayedHeaders).toBe(HEADERS);
    });
  });
});
