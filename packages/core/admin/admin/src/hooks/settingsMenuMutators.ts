import type { SettingsMenu } from './useSettingsMenu';

/**
 * Extension point: plugins can reshape the Settings menu (e.g.
 * @strapi/plugin-spaces hides the sections a workspace isn't entitled to).
 *
 * Each registration is a **custom hook** returning a pure mutator — the hook
 * runs inside `useSettingsMenu`, so mutators may subscribe to reactive data
 * (RTK queries, storage). Registration happens during plugin
 * `register`/`bootstrap`, before the first render, so the hook list is stable
 * and the rules of hooks hold.
 */
type SettingsMenuMutator = (menu: SettingsMenu) => SettingsMenu;

interface SettingsMenuMutatorHook {
  id: string;
  useMutator: () => SettingsMenuMutator;
}

const mutatorHooks: SettingsMenuMutatorHook[] = [];

export const registerSettingsMenuMutator = (entry: SettingsMenuMutatorHook) => {
  const index = mutatorHooks.findIndex((item) => item.id === entry.id);
  if (index === -1) {
    mutatorHooks.push(entry);
  } else {
    mutatorHooks[index] = entry;
  }
};

export const getSettingsMenuMutators = (): readonly SettingsMenuMutatorHook[] => mutatorHooks;

export type { SettingsMenuMutator, SettingsMenuMutatorHook };
