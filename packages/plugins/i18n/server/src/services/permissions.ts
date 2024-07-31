import i18nActionsService from './permissions/actions';
import sectionsBuilderService from './permissions/sections-builder';
import engineService from './permissions/engine';

const permissions = () => ({
  actions: i18nActionsService,
  sectionsBuilder: sectionsBuilderService,
  engine: engineService,
});

type PermissionsService = typeof permissions;

export default permissions;
export type { PermissionsService };
