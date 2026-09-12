import { ALL_SPACES, SPACE_HEADER, STORAGE_KEY } from '../constants';
import { getSelectedSpace, getSpaceHeaders, isAllSpaces, setSelectedSpace } from '../selectedSpace';

describe('the remembered space', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setSelectedSpace(null);
  });

  it('is sent with every request once chosen', () => {
    setSelectedSpace('germany');

    expect(getSpaceHeaders()).toEqual({ [SPACE_HEADER]: 'germany' });
  });

  it('sends nothing when none is chosen, so the server picks the caller’s own', () => {
    expect(getSpaceHeaders()).toEqual({ [SPACE_HEADER]: undefined });
  });

  it('survives a reload', () => {
    setSelectedSpace('france');

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('france');
  });

  it('is forgotten when cleared', () => {
    setSelectedSpace('france');
    setSelectedSpace(null);

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(getSelectedSpace()).toBeNull();
  });

  it('still applies when the browser refuses to remember it', () => {
    // A private window, or storage the browser has blocked. Not being able to
    // remember the choice is survivable; not applying it is not.
    const setItem = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    expect(() => setSelectedSpace('germany')).not.toThrow();
    expect(getSelectedSpace()).toBe('germany');

    setItem.mockRestore();
  });

  it('recognises the all-spaces view', () => {
    expect(isAllSpaces(ALL_SPACES)).toBe(true);
    expect(isAllSpaces('france')).toBe(false);
    expect(isAllSpaces(null)).toBe(false);
  });
});
