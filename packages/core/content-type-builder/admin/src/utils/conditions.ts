import type { AnyAttribute } from '../types';

interface DependentRow {
  contentTypeUid: string;
  contentType: string;
  attribute: string;
}

export const checkDependentRows = (
  contentTypes: Record<string, any>,
  fieldName: string
): DependentRow[] => {
  const dependentRows: DependentRow[] = [];

  Object.entries(contentTypes).forEach(([contentTypeUid, contentType]: [string, any]) => {
    if (contentType.attributes) {
      // Handle both array and object formats of attributes
      const attributes = Array.isArray(contentType.attributes)
        ? contentType.attributes.reduce((acc: Record<string, any>, attr: any, index: number) => {
            acc[index.toString()] = attr;
            return acc;
          }, {})
        : contentType.attributes;

      Object.entries(attributes).forEach(([attrName, attr]: [string, any]) => {
        if (attr.conditions?.visible) {
          Object.entries(attr.conditions.visible).forEach(([, conditions]) => {
            const [fieldVar] = conditions as [{ var: string }, any];
            // Check if this condition references our field
            if (fieldVar && fieldVar.var === fieldName) {
              dependentRows.push({
                contentTypeUid,
                contentType: contentType.info.displayName,
                attribute: attr.name || attrName,
              });
            }
          });
        }
      });
    }
  });
  return dependentRows;
};

export const formatCondition = (
  condition: any,
  availableFields: Array<{ name: string; type: string }>,
  attributeName: string
): string => {
  if (!condition?.visible) {
    return '';
  }

  const [[operator, conditions]] = Object.entries(condition.visible);
  const [fieldVar, value] = conditions as [{ var: string }, any];

  const dependsOnField = availableFields.find((field) => field.name === fieldVar.var);
  const dependsOnFieldName = dependsOnField ? dependsOnField.name : fieldVar.var;

  const operatorText = operator === '==' ? 'is' : 'is not';
  const valueText = String(value);
  const actionText = operator === '==' ? 'Show' : 'Hide';

  return `If ${dependsOnFieldName} ${operatorText} ${valueText}, then ${actionText} ${attributeName}`;
};

export const getAvailableConditionFields = (
  attributes: AnyAttribute[],
  currentFieldName: string
) => {
  return attributes
    .filter((attr) => {
      // Only include boolean and enum fields
      const isCorrectType = attr.type === 'boolean' || attr.type === 'enumeration';
      // Exclude the current field to prevent self-referential conditions
      const isNotCurrentField = attr.name !== currentFieldName;
      return isCorrectType && isNotCurrentField;
    })
    .map((attr) => ({
      name: attr.name,
      type: attr.type,
      enum: attr.type === 'enumeration' ? attr.enum : undefined,
    }));
};
