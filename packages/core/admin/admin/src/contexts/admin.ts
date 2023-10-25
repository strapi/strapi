import * as React from 'react';

interface InjectedComponent {
  Component: React.ComponentType;
  name: string;

  // TODO: in theory this could receive and forward any React component prop
  // but in practice there only seems to be once instance, where `slug` is
  // forwarded. The type needs to become either more generic or we disallow
  // prop spreading and offer a different way to access context data.
  slug: string;
}

interface AdminContextValue {
  /**
   * TODO: this should come from `StrapiApp['getAdminInjectedComponents']`
   */
  getAdminInjectedComponents: (
    moduleName: string,
    page: string,
    position: string
  ) => InjectedComponent[];
}

const AdminContext = React.createContext<AdminContextValue>({
  getAdminInjectedComponents() {
    throw new Error('AdminContext: getAdminInjectedComponents() not implemented');
  },
});

const useAdmin = () => React.useContext(AdminContext);

export { AdminContext, useAdmin };
export type { AdminContextValue };
