import type { AnyAttribute, AttributeConditions, ContentTypes } from '../types';

interface DependentRow {
  contentTypeUid: string;
  contentType: string;
  attribute: string;
}

export const checkDependentRows = (
  contentTypes: ContentTypes,
  fieldName: string
): DependentRow[] => {
  const dependentRows: DependentRow[] = [];

  Object.entries(contentTypes).forEach(([contentTypeUid, contentType]) => {
    if (contentType.attributes !== undefined) {
      // Handle both array and object formats of attributes
      const attributes = Array.isArray(contentType.attributes)
        ? contentType.attributes.reduce<Record<string, AnyAttribute>>((acc, attr, index) => {
            acc[index.toString()] = attr;
            return acc;
          }, {})
        : contentType.attributes;

      Object.entries(attributes).forEach(([attrName, attr]) => {
        if (attr.conditions?.visible !== undefined) {
          Object.entries(attr.conditions.visible).forEach(([, conditions]) => {
            const [fieldVar] = conditions;
            // Check if this condition references our field
            if (fieldVar.var === fieldName) {
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
  condition: AttributeConditions,
  availableFields: Array<{ name: string; type: string }>,
  attributeName: string
): string => {
  if (condition.visible === undefined) {
    return '';
  }

  const conditionEntry = Object.entries(condition.visible)[0];

  if (conditionEntry === undefined) {
    return '';
  }

  const [operator, conditions] = conditionEntry;
  const [fieldVar, value] = conditions;

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
