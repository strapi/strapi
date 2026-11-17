import { getTranslation } from '../../../utils/getTranslation';

import type { ConditionSource } from '../../../../../shared/contracts/permissions';

/** What the list and the page of a condition call where it comes from */
const SOURCE_LABELS: Record<ConditionSource, { id: string; defaultMessage: string }> = {
  builtin: { id: getTranslation('conditions.source.builtin'), defaultMessage: 'Built-in' },
  code: { id: getTranslation('conditions.source.code'), defaultMessage: 'Code' },
  plugin: { id: getTranslation('conditions.source.plugin'), defaultMessage: 'Plugin' },
  builder: { id: getTranslation('conditions.source.builder'), defaultMessage: 'Builder' },
};

export { SOURCE_LABELS };
