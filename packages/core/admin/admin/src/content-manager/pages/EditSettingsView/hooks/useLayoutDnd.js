import * as React from 'react';

import { LayoutDndContext } from '../components/LayoutDndProvider';

export function useLayoutDnd() {
  return React.useContext(LayoutDndContext);
}
