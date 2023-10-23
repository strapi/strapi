import * as React from 'react';

interface AdminContextValue {
  /**
   * TODO: this should come from `StrapiApp['getAdminInjectedComponents']`
   */
  getAdminInjectedComponents: () => unknown;
}

const AdminContext = React.createContext<AdminContextValue>({
  getAdminInjectedComponents() {
    throw new Error('AdminContext: getAdminInjectedComponents() not implemented');
  },
});

const useAdmin = () => React.useContext(AdminContext);

export { AdminContext, useAdmin };
export type { AdminContextValue };
