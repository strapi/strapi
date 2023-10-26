import * as React from 'react';

import type { StrapiApp } from '../StrapiApp';
interface AdminContextValue {
  getAdminInjectedComponents: StrapiApp['getAdminInjectedComponents'];
}

const AdminContext = React.createContext<AdminContextValue>({
  getAdminInjectedComponents() {
    throw new Error('AdminContext: getAdminInjectedComponents() not implemented');
  },
});

const useAdmin = () => React.useContext(AdminContext);

export { AdminContext, useAdmin };
export type { AdminContextValue };
