import { createContext } from '@radix-ui/react-context';

import type { StrapiApp } from '../StrapiApp';
interface AdminContextValue {
  getAdminInjectedComponents: StrapiApp['getAdminInjectedComponents'];
}

const [AdminContextProvider, useAdminContext] = createContext<AdminContextValue>('AdminContext');

const useAdmin = () => useAdminContext('useAdmin');

export { AdminContextProvider, useAdmin };
export type { AdminContextValue };
