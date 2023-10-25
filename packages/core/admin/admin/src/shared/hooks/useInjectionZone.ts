import { useAdmin } from '../../contexts/admin';

export type InjectionZoneArea =
  | 'contentManager.editView.informations'
  | 'contentManager.editView.right-links'
  | 'contentManager.listView.actions'
  | 'contentManager.listView.unpublishModalAdditionalInfos'
  | 'contentManager.listView.deleteModalAdditionalInfos'
  | 'contentManager.listView.publishModalAdditionalInfos'
  | 'contentManager.listView.deleteModalAdditionalInfos';

export const useInjectionZone = (area: InjectionZoneArea) => {
  const { getAdminInjectedComponents } = useAdmin();

  const [moduleName, page, position] = area.split('.');

  return getAdminInjectedComponents(moduleName, page, position);
};
