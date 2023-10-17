import { useAdmin } from '../../../contexts/admin';

const useInjectionZone = (area) => {
  const { getAdminInjectedComponents } = useAdmin();

  const [moduleName, page, position] = area.split('.');

  return getAdminInjectedComponents(moduleName, page, position);
};

export default useInjectionZone;
