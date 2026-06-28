import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';

type InputPopoverContextValue = {
  children?: React.ReactNode;
};

const [InputPopoverProvider, useInputPopoverContext] =
  createContext<InputPopoverContextValue>('InputPopover');

function useHasInputPopoverParent() {
  const context = useInputPopoverContext('useHasInputPopoverParent', () => true, false);

  return context !== undefined;
}

export { InputPopoverProvider, useHasInputPopoverParent };
