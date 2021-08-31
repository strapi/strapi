import useAdminProvider from '../useAdminProvider';

const useInjectionZone = area => {
  const { getAdminInjectedComponents } = useAdminProvider();

  const [moduleName, page, position] = area.split('.');

  return getAdminInjectedComponents(moduleName, page, position);
};

export default useInjectionZone;
