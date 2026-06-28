import { createContext } from '@strapi/admin/strapi-admin';

type InputPopoverContextValue = Record<string, never>;

const [InputPopoverProvider, useInputPopoverContext] =
  createContext<InputPopoverContextValue>('InputPopover');

function useHasInputPopoverParent() {
  const context = useInputPopoverContext('useHasInputPopoverParent', () => true, false);

  return context !== undefined;
}

export { InputPopoverProvider, useHasInputPopoverParent };
