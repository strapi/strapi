/* eslint-disable no-confusing-arrow */

const shouldPluralizeName = nature =>
  ['manyToMany', 'oneToMany', 'manyWay'].includes(nature) ? 2 : 1;

const shouldPluralizeTargetAttribute = nature =>
  ['manyToMany', 'manyToOne'].includes(nature) ? 2 : 1;

export { shouldPluralizeName, shouldPluralizeTargetAttribute };
