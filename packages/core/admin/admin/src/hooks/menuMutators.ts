import type { Menu } from './useMenu';

/**
 * Extension point: plugins can reshape the main navigation menu (e.g. hide a
 * link based on runtime context). Mirrors `settingsMenuMutators.ts`.
 *
 * Each registration is a **custom hook** returning a pure mutator — the hook
 * runs inside `useMenu`, so mutators may subscribe to reactive data.
 * Registration happens during plugin `register`/`bootstrap`, before the first
 * render, so the hook list is stable and the rules of hooks hold.
 */
type MenuMutator = (menu: Menu) => Menu;

interface MenuMutatorHook {
  id: string;
  useMutator: () => MenuMutator;
}

const menuMutatorHooks: MenuMutatorHook[] = [];

export const registerMenuMutator = (entry: MenuMutatorHook) => {
  const index = menuMutatorHooks.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    menuMutatorHooks.push(entry);
  } else {
    menuMutatorHooks[index] = entry;
  }
};

export const getMenuMutators = (): readonly MenuMutatorHook[] => menuMutatorHooks;

export type { MenuMutator, MenuMutatorHook };
