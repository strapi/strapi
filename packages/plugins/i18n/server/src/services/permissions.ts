import i18nActionsService from './permissions/actions';
import sectionsBuilderService from './permissions/sections-builder';
import engineService from './permissions/engine';

export default () => ({
  actions: i18nActionsService,
  sectionsBuilder: sectionsBuilderService,
  engine: engineService,
});
