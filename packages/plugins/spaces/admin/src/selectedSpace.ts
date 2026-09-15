import { ALL_SPACES, SPACE_HEADER, STORAGE_KEY } from './constants';

type Listener = (slug: string | null) => void;

/**
 * The space the admin is currently working in.
 *
 * Kept outside React because it is read from two places that are not
 * components: the header every API request carries, and the reload that follows
 * a switch. React reads it through {@link useSelectedSpace}.
 *
 * It is a preference, never a permission. The server decides what the caller
 * may do in the space they name and refuses the ones they may not enter, so a
 * tampered value gets an error rather than someone else's content.
 */
let selected: string | null = read();

const listeners = new Set<Listener>();

function read(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing, or storage the browser has blocked. Falling back to no
    // remembered space is correct: the server picks the caller's default.
    return null;
  }
}

export const getSelectedSpace = () => selected;

export const setSelectedSpace = (slug: string | null) => {
  selected = slug;

  try {
    if (slug === null) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, slug);
    }
  } catch {
    // Not being able to remember the choice is survivable; not applying it is
    // not, so the in-memory value stands either way.
  }

  listeners.forEach((listener) => listener(slug));
};

export const subscribeToSelectedSpace = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/**
 * The header every admin request carries.
 *
 * Sending nothing when no space is remembered is deliberate: the server then
 * puts the caller in their own default space, which is what a first visit and a
 * fresh browser should both do.
 */
export const getSpaceHeaders = (): Record<string, string | undefined> => ({
  [SPACE_HEADER]: selected ?? undefined,
});

export const isAllSpaces = (slug: string | null) => slug === ALL_SPACES;
