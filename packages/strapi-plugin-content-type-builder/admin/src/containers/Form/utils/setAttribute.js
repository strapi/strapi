import { cloneDeep, forEach, includes, set, unset, replace } from 'lodash';

/* eslint-disable consistent-return */

export default function setParallelAttribute(newAttribute) {
  if (newAttribute.params.target === this.props.modelName) {
    const parallelAttribute = cloneDeep(newAttribute);
    parallelAttribute.name = newAttribute.params.key;
    parallelAttribute.params.key = newAttribute.name;
    parallelAttribute.params.columnName = newAttribute.params.targetColumnName;
    parallelAttribute.params.targetColumnName = newAttribute.params.columnName;
    parallelAttribute.params.dominant = false;

    if (newAttribute.params.nature) {
      switch (newAttribute.params.nature) {
        case 'manyToOne':
          parallelAttribute.params.nature = 'oneToMany';
          break;
        case 'oneToMany':
          parallelAttribute.params.nature = 'manyToOne';          
          break;
        default:
        //
      }
    }
    return parallelAttribute;
  }
  return;
}

export function setTempAttribute() {
  const newAttribute = cloneDeep(this.props.modifiedDataAttribute);

  forEach(newAttribute.params, (value, key) => {
    if (includes(key, 'Value')) {
      set(newAttribute.params, replace(key, 'Value', ''), value);
      unset(newAttribute.params, key);
    }
  });

  return newAttribute;
}
