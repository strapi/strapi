import { ALL_SPACES, SPACE_HEADER, STORAGE_KEY } from '../constants';
import {
  getSelectedSpace,
  getSpaceHeaders,
  isAllSpaces,
  setSelectedSpace,
  subscribeToSelectedSpace,
} from '../selectedSpace';

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

describe('watching the space change', () => {
  it('tells whoever is listening, so the admin can react to a switch', () => {
    const heard: Array<string | null> = [];
    const stop = subscribeToSelectedSpace((slug) => heard.push(slug));

    setSelectedSpace('france');
    setSelectedSpace(ALL_SPACES);
    setSelectedSpace(null);

    stop();

    expect(heard).toEqual(['france', ALL_SPACES, null]);
  });

  it('stops telling them once they have stopped listening', () => {
    const heard: Array<string | null> = [];
    const stop = subscribeToSelectedSpace((slug) => heard.push(slug));

    stop();
    setSelectedSpace('france');

    expect(heard).toEqual([]);
  });

  it('tells every listener', () => {
    const first = jest.fn();
    const second = jest.fn();
    const stopFirst = subscribeToSelectedSpace(first);
    const stopSecond = subscribeToSelectedSpace(second);

    setSelectedSpace('france');

    stopFirst();
    stopSecond();

    expect(first).toHaveBeenCalledWith('france');
    expect(second).toHaveBeenCalledWith('france');
  });
});

describe('a browser that has blocked storage', () => {
  it('starts with no remembered space, so the server picks the caller’s own', () => {
    // Private browsing, or site data turned off. The space is a preference;
    // losing it costs a redirect to the default, not access.
    jest.isolateModules(() => {
      const blocked = {
        getItem: () => {
          throw new Error('SecurityError');
        },
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', { value: blocked, configurable: true });

      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const fresh = require('../selectedSpace') as typeof import('../selectedSpace');

      expect(fresh.getSelectedSpace()).toBeNull();
    });
  });
});
